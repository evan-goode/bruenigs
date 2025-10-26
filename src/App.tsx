import { useState, useEffect } from "react";
import { DateTime } from "luxon";
import "chartjs-adapter-date-fns";
import isBonusTitle from "./isBonusTitle.ts";

// Bun is trash
import icon from "./icon.png";
icon;

const REPO_URL = "https://github.com/evan-goode/bruenigs";
const PULL_REQUESTS_URL = `${REPO_URL}/pulls`;
const QUOTA_HOURS_PER_YEAR = 52;

import {
  Chart as ChartJS,
  LineController,
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  Legend,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Title,
  Tooltip,
);

interface Episode {
  date: Date,
  title: string,
  hours: number,
  duration: string,
  guid: string,
  link: string,
}

const durationToHours = function(duration: string) {
  const parts = duration.split(":");
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  if (parts.length === 3) {
    hours = parseInt(parts[0]!);
    minutes = parseInt(parts[1]!);
    seconds = parseInt(parts[2]!);
  } else if (parts.length === 2) {
    minutes = parseInt(parts[0]!);
  } else if (parts.length === 1) {
    seconds = parseInt(parts[0]!);
  } else {
    throw `malformed duration: ${duration}`;
  }
  return hours + minutes / 60 + seconds / 3600;
}

const hoursToDuration = function(hours: number): string {
  const totalSeconds = Math.floor(hours * 3600);

  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const hh = !isNaN(h) && isFinite(h) ? h.toString().padStart(2, "0") : "--";
  const mm = !isNaN(m) && isFinite(m) ? m.toString().padStart(2, "0") : "--";
  const ss = !isNaN(s) && isFinite(s) ? s.toString().padStart(2, "0") : "--";

  return `${hh}:${mm}:${ss}`;
};

const episodesToSeries = function(episodes: Episode[]) {
  let totalHours = 0;

  const series = [];
  for (const episode of episodes) {
    totalHours += episode.hours;
    series.push({
      x: episode.date,
      y: totalHours,
      label: episode.title,
      duration: episode.duration,
    });
  }

  return series;
}

const YearMetrics = function({ episodes }: {episodes: Episode[]}) {
  const allSeries = episodesToSeries(episodes);
  const nonBonusSeries = episodesToSeries(episodes.filter(e => !isBonusTitle(e.title)));

  const currentTotalHours = Math.max(...allSeries.map(e => e.y));
  const currentQuotaHours = Math.max(...nonBonusSeries.map(e => e.y));
  const currentBonusHours = currentTotalHours - currentQuotaHours;

  const minYear = episodes[0]!.date.getFullYear();
  const maxYear = episodes[episodes.length - 1]!.date.getFullYear();
  const minDate = DateTime.fromObject(
    { year: minYear, month: 1, day: 1, hour: 0, minute: 0, second: 0 },
    { zone: "America/New_York" }
  ).toJSDate();
  const maxDate = DateTime.fromObject(
    { year: maxYear + 1, month: 1, day: 1, hour: 0, minute: 0, second: 0 },
    { zone: "America/New_York" }
  ).toJSDate();

  const quotaHours = QUOTA_HOURS_PER_YEAR * (maxDate.getFullYear() - minDate.getFullYear());

  const statsElement = (() => {
    const millisPerDay = 24 * 60 * 60 * 1000;
    const millisPerWeek = 7 * millisPerDay;
    const now = Math.min(new Date().valueOf(), maxDate.valueOf());

    const timeSinceStart = now - minDate.valueOf();
    const timeStartToEnd = maxDate.valueOf() - minDate.valueOf();
    const paceHours = quotaHours * timeSinceStart / timeStartToEnd;

    const hoursAheadPace = currentQuotaHours - paceHours;
    const timeUntilPace = (currentQuotaHours / quotaHours * timeStartToEnd) - timeSinceStart;
    const daysUntilPace = timeUntilPace / millisPerDay;

    const weeksRemaining = (maxDate.valueOf() - now) / millisPerWeek;
    const hoursBehindQuota = Math.max(0, quotaHours - currentQuotaHours);
    const hoursNeededPerWeek = hoursBehindQuota / weeksRemaining || 0;

    return (
      <div className="stats-grid">
        <div className="stat">{hoursToDuration(currentQuotaHours)}</div>
        <div className="label">
          quota-eligible YTD hours ({Math.round(100 * currentQuotaHours / currentTotalHours)}% of total YTD hours)
        </div>

        <div className="stat">{hoursToDuration(currentBonusHours)}</div>
        <div className="label">
          bonus YTD hours ({Math.round(100 * currentBonusHours / currentTotalHours)}% of total YTD hours)
        </div>

        <div className="stat">{hoursToDuration(Math.abs(hoursAheadPace))}</div>
        <div className="label">{hoursAheadPace > 0 ? "ahead of" : "behind"} pace</div>

        <div className="stat">{Math.abs(daysUntilPace).toFixed(1)}</div>
        <div className="label">days {daysUntilPace > 0 ? "ahead of" : "behind"} pace</div>

        <div className="stat">{hoursToDuration(hoursBehindQuota)}</div>
        <div className="label">hours needed to meet quota</div>

        <div className="stat">{hoursToDuration(hoursNeededPerWeek)}</div>
        <div className="label">hours/week needed to meet quota</div>
      </div>
    );
  })();

  const data = {
    datasets: [
      {
        data: allSeries,
        label: "All published episodes",
        borderColor: "gray",
        pointBackgroundColor: "gray",
        fill: false,
        tension: 0,
        pointRadius: 3,
        borderDash: [5, 5],
        stepped: "before",
      },
      {
        data: nonBonusSeries,
        label: "Quota-eligible",
        borderColor: "#004080",
        pointBackgroundColor: "#004080",
        fill: false,
        tension: 0,
        pointRadius: 3,
        stepped: "before",
      },
    ]
  };

  const plugins = [
    {
      id: "guides",
      afterDatasetsDraw(chart: any) {
        const yValue = quotaHours;
        const { ctx, scales } = chart;
        const yPixel = scales.y.getPixelForValue(yValue);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(scales.x.left, scales.y.bottom);
        ctx.lineTo(scales.x.right, yPixel);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "darkred";
        ctx.stroke();
        ctx.restore();
      }
    }
  ];

  const options = {
    animation: false,
    scales: {
      x: {
        type: "time",
        time: { unit: "day" },
        min: minDate,
        max: maxDate,
      },
      y: {
        title: {
          display: true,
          text: "Hours",
        },
        min: 0,
        max: Math.max(quotaHours, currentTotalHours) + 5,
      },
    },
    plugins: {
      legend: { display: true, position: 'bottom' },
      tooltip: {
        enabled: true,
        animations: false,
        callbacks: {
          title: (tooltipItems: any) => {
            const first = tooltipItems[0];
            const point = first.raw as { label: string; x: Date; y: number; duration: string };
            return point.label;
          },
          label: (context: any) => {
            const point = context.raw as { label: string; x: Date; y: number; duration: string };
            const formatted = point.x.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric"
            });
            return [`${formatted} ${point.duration}`, `Total hours: ${hoursToDuration(point.y)}`];
          },
        },
      }
    }
  };

  const bonusEpisodes = episodes.filter(e => isBonusTitle(e.title));
  let bonusEpisodesElement = (() => {
    if (!bonusEpisodes.length) {
      return <p>No bonus episodes.</p>
    }
    return <>
      <p>The following episodes meet our criteria for bonus podtent and are not counted towards annual quotas:</p>
      <ul>
        {bonusEpisodes.map(episode => {
          return <li key={episode.guid}><a href={episode.link}>{episode.title}</a></li>;
        })}
      </ul>
    </>;
  })();

  return <div>
    <Line data={data as any} options={options as any} plugins={plugins} />
    {statsElement}
    {bonusEpisodesElement}
  </div>;
}

const yearFilter = function(year: number) {
  return (episode: Episode) => {
    return episode.date.getFullYear() === year;
  }
}

const Loader = function() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/feed.xml");
        if (!response.ok) throw "network response was not ok";
        const rss = await response.text();

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(rss, "application/xml");
        const items = Array.from(xmlDoc.querySelectorAll("channel > item"));

        const unsorted = [];
        for (const item of items) {
          const title = item.querySelector(":scope > title")!.textContent;
          const date = new Date(item.querySelector(":scope > pubDate")!.textContent);
          const duration = Array.from(item.children).find(el => el.localName === "duration")!.textContent;
          const hours = durationToHours(duration);
          const link = item.querySelector(":scope > link")!.textContent;
          const guid = item.querySelector(":scope > guid")!.textContent;
          unsorted.push({
            date,
            title,
            hours,
            duration,
            link,
            guid,
          });
        }
        const sorted = unsorted.toSorted((a, b) => a.date.valueOf() - b.date.valueOf());
        setEpisodes(sorted);

        if (!sorted.length) {
          setError("no episodes found in feed");
        }
      } catch (err: any) {
        setError(err.message || "failed to fetch feed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }
  if (error) {
    return <div>Error: {error}</div>;
  }

  return <Dashboard episodes={episodes} />
}

const Dashboard = function({ episodes }: { episodes: Episode[] }) {
  const yearsSet = new Set<number>();
  for (const episode of episodes) {
    yearsSet.add(episode.date.getFullYear());
  }
  const years = [...yearsSet].toSorted((a, b) => b - a);

  const params = new URLSearchParams(window.location.search);

  const [year, setYear] = useState<string>(params.get("year") || years[0]!.toString());
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = event.target.value;
    const url = new URL(window.location.href);
    url.searchParams.set("year", newYear);
    window.history.replaceState({}, "", url);
    setYear(newYear);
  };

  const yearEpisodes = episodes.filter(yearFilter(parseInt(year)));

  return (
    <div>
      <div className="year">
        <span>Select year: </span>
        <select value={year} onChange={handleChange}>
          {[...years].map(year => <option value={year} key={year}>{year}</option>)}
        </select>
      </div>
      {yearEpisodes.length &&
        <YearMetrics episodes={yearEpisodes} /> || <p>No episodes for {year}.</p>}
    </div >
  );
}

export function App() {
  return (
    <>
      <main>
        <header>
          <h1>Bruenigs Accountability Project</h1>
          <p>Your source for transparent podtent metrics</p>
        </header>
        <div className="content">
          <Loader />
          <h3>Discriminating quota-eligible podtent from bonus podtent</h3>
          <p>A quota-eligible episode must meet ALL of the following criteria:</p>
          <ol>
            <li>
              The episode is not marked as bonus content in its title or description, nor is it part of a series with other episodes marked as bonus content. (<em>Trivial</em> criterion)
              <ul>
                <li>Case: <a href="https://www.patreon.com/posts/matts-mom-noella-92416928">Matt's Mom, Noella</a> meets <em>Auteur</em> criterion but is not quota-eligible because it is labeled a "Bonus ep".</li>
              </ul>
            </li>
            <li>One or both Bruenigs play a large role in directing the episode (<em>Auteur</em> criterion)
              <ul>
                <li>Case: <a href="https://www.patreon.com/posts/matt-on-its-just-71030241">Matt on It's Just Banter</a> meets <em>Trivial</em> criterion but is not quota-eligible because neither Bruenig makes a significant directorial contribution.</li>
                <li>Case: <a href="https://www.patreon.com/posts/tc-and-matts-nyc-117976348">TC and Matt's Great NYC Adventure</a> is an unconventional episode which features TC and no Liz. Yet it is quota-eligible since it meets the <em>Trivial</em> criterion and Matt makes a substantial directorial contribution.</li>
              </ul>
            </li>
          </ol>
          <p>Have a better classification system or see a misclassified episode? <a href={PULL_REQUESTS_URL}>File a pull request</a>.</p>
          <p><a href="https://www.patreon.com/thebruenigs">Subscribe to The Bruenigs on Patreon</a></p>
        </div>
      </main>
      <footer>Created by <a href="https://github.com/evan-goode">Evan Goode</a>. Licensed as <a href="https://www.gnu.org/licenses/agpl-3.0.en.html">AGPL-3.0-only</a>. <a href={REPO_URL}>Source code</a>.</footer>
    </>
  );
}

export default App;
