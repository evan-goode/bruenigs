#!/usr/bin/env python3

import sys
import os
import io
import traceback
import tempfile

from mutagen.mp3 import MP3
from xml.etree import ElementTree as ET
import curl_cffi
import xmlschema

FEED_URL = sys.argv[1]
OUTPUT_PATH = sys.argv[2]

BROWSER = "chrome"
PROXIES = {}
# PROXIES = {"https": "socks://localhost:9090"}

def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)

def main():
    # Register iTunes namespace
    ITUNES_NS = "http://www.itunes.com/dtds/podcast-1.0.dtd"
    ET.register_namespace("itunes", ITUNES_NS)

    # Get set of existing episode GUIDs
    existing_durations = {}
    try:
        output_xml_data = open(OUTPUT_PATH, "rb").read()
        resource = xmlschema.XMLResource(output_xml_data, defuse="always")
        existing_output_root = resource.root
        existing_output_channel = existing_output_root.find("channel")
        for existing_output_item in existing_output_channel.findall("item"):
            guid = existing_output_item.find("guid").text
            duration = existing_output_item.find(f"{{{ITUNES_NS}}}duration").text
            existing_durations[guid] = duration
    except Exception as e:
        eprint(f"could not read output file {OUTPUT_PATH}: {e}")
        traceback.print_exc()
        pass

    # Fetch feed URL
    input_xml_data = curl_cffi.get(FEED_URL, proxies=PROXIES).content
    eprint(f"fetched input feed")

    # Parse safely
    resource = xmlschema.XMLResource(input_xml_data, defuse="always")
    input_channel = resource.find("channel")

    output_root = ET.Element("rss", version="2.0")
    output_channel = ET.SubElement(output_root, "channel")
    ET.SubElement(output_channel, "title").text = input_channel.find("title").text

    for input_item in input_channel.findall("item"):
        enclosure = input_item.find("enclosure")
        url = enclosure.attrib.get("url")
        title = input_item.find("title").text
        guid = input_item.find("guid").text

        output_item = ET.SubElement(output_channel, "item")

        output_item.append(input_item.find("title"))
        output_item.append(input_item.find("description"))
        output_item.append(input_item.find("guid"))
        output_item.append(input_item.find("pubDate"))
        output_item.append(input_item.find("link"))

        if input_item.find(f"{{{ITUNES_NS}}}duration") is not None:
            eprint(f"episode {guid} \"{title}\" duration exists in input XML")
            output_item.append(input_item.find(f"{{{ITUNES_NS}}}duration"))
        else:
            if guid in existing_durations:
                eprint(f"episode {guid} \"{title}\" duration exists in output XML")
                duration_str = existing_durations[guid]
            else:
                eprint(f"episode {guid} \"{title}\" missing duration, fetching MP3 file")
                with tempfile.NamedTemporaryFile(suffix=".mp3", dir=os.getcwd()) as tmp_file:
                    def callback(chunk):
                        tmp_file.write(chunk)
                    response = curl_cffi.get(url, impersonate=BROWSER, proxies=PROXIES, content_callback=callback)
                    response.raise_for_status()
                    tmp_file.flush()

                    audio = MP3(tmp_file.name)
                    duration_seconds = int(audio.info.length)

                # Convert duration to hh:mm:ss format
                hours, remainder = divmod(duration_seconds, 3600)
                minutes, seconds = divmod(remainder, 60)
                duration_str = f"{hours:d}:{minutes:02d}:{seconds:02d}" if hours else f"{minutes:d}:{seconds:02d}"

            ET.SubElement(output_item, f"{{{ITUNES_NS}}}duration").text = duration_str

        # Serialize modified XML to a new file
        tree = ET.ElementTree(output_root)
        tmp_path = OUTPUT_PATH+".tmp"
        tree.write(tmp_path, encoding="utf-8", xml_declaration=True)
        os.replace(tmp_path, OUTPUT_PATH)
        eprint(f"wrote {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
