# Bruenigs Accountability Project

Your source for transparent podtent metrics.

## Hacking

1.
    ```
    nix develop
    ```

3. 
    ```
    cp example.env .env
    ```
    And put your feed URL in `.env`.

4. Optionally, fetch cached sanitized feed to avoid re-downloading each episode to get duration:
    ```
    curl -O https://bruenigs.evangoo.de/feed.xml
    ```

5.
    ```
    bun dev
    ```

6. Deploy using the NixOS module:
    ```
    services.bruenigs = {
        enable = true;
        port = 3447;
        feed-url-file = "/tmp/feed-url-file";
    };
    ```

    And add a reverse-proxy.

# License

[AGPL-3.0-only](LICENSE)

