{
  description = "Bun2Nix react sample";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
    systems.url = "github:nix-systems/default";

    bun2nix.url = "github:baileyluTCD/bun2nix?tag=1.5.2";
    bun2nix.inputs.nixpkgs.follows = "nixpkgs";
    bun2nix.inputs.systems.follows = "systems";
  };

  # Use the cached version of bun2nix from the garnix cli
  nixConfig = {
    extra-substituters = [
      "https://cache.nixos.org"
      "https://cache.garnix.io"
    ];
    extra-trusted-public-keys = [
      "cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY="
      "cache.garnix.io:CTFPyKSLcx5RMJKfLo5EEPUObbA78b0YQ2DTCJXqr9g="
    ];
  };

  outputs =
    {
      self,
      nixpkgs,
      systems,
      bun2nix,
      ...
    }:
    let
      # Read each system from the nix-systems input
      eachSystem = nixpkgs.lib.genAttrs (import systems);

      # Access the package set for a given system
      pkgsFor = eachSystem (system: import nixpkgs { inherit system; });

      pythonEnv =
        pkgs:
        pkgs.python3.withPackages (
          ps: with ps; [
            xmlschema
            mutagen
            curl-cffi
          ]
        );
    in
    {
      packages = eachSystem (system: rec {
        feed-updater =
          let
            pkgs = pkgsFor.${system};
          in
          pkgs.stdenv.mkDerivation {
            pname = "feed-updater";
            version = "0.1.0";
            src = ./feed-updater.py;
            dontUnpack = true;

            buildInputs = [ (pythonEnv pkgs) ];

            patchPhase = ''
              patchShebangs .
            '';

            installPhase = ''
              mkdir -p $out/bin
              cp $src $out/bin/feed-updater.py
            '';
          };
        default = pkgsFor.${system}.callPackage ./default.nix {
          inherit (bun2nix.lib.${system}) mkBunDerivation;
          inherit feed-updater;
          pkgs = pkgsFor.${system};
        };
      });

      devShells = eachSystem (system: {
        default = pkgsFor.${system}.mkShell {
          packages = with pkgsFor.${system}; [
            (pythonEnv pkgsFor.${system})

            bun

            # Add the bun2nix binary to our devshell
            bun2nix.packages.${system}.default
          ];

          shellHook = ''
            export PATH="$(pwd):$PATH"
            bun install --frozen-lockfile
          '';
        };
      });

      nixosModules.default =
        {
          config,
          lib,
          pkgs,
          ...
        }:
        with lib;
        let
          cfg = config.services.bruenigs;
        in
        {
          options.services.bruenigs = {
            enable = mkEnableOption (lib.mdDoc ''bruenigs'');
            package = mkPackageOption {
              bruenigs = self.packages.${pkgs.system}.default;
            } "bruenigs" { };
            feed-url-file = mkOption {
              type = types.path;
            };
            port = mkOption {
              type = types.port;
              default = 3447;
            };
          };
          config = mkIf cfg.enable {
            systemd.services.bruenigs = {
              description = "Bruenigs Accountability Project";
              wantedBy = [ "multi-user.target" ];
              serviceConfig = {
                ExecStart = "${cfg.package}/bin/bruenigs";
                LoadCredential = "feed-url-file:${cfg.feed-url-file}";
                Environment = [
                  "NODE_ENV=production"
                  "PORT=${toString cfg.port}"
                  "FEED_URL_FILE=%d/feed-url-file"
                  "STATE_DIRECTORY=/var/lib/bruenigs"
                ];
                DynamicUser = true;
                StateDirectory = "bruenigs";
                Restart = "always";
              };
              after = [
                "network-online.target"
                "nss-lookup.target"
              ];
              wants = [
                "network-online.target"
                "nss-lookup.target"
              ];
            };

          };
        };
    };
}
