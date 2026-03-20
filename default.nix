{
  pkgs,
  bun2nix,
  feed-updater,
  ...
}:
bun2nix.mkDerivation rec {
  pname = "bruenigs";
  version = "0.1.0";

  nativeBuildInputs = with pkgs; [
    makeWrapper
  ];

  src = ./.;

  bunDeps = bun2nix.fetchBunDeps {
    bunNix = ./bun.nix;
  };

  module = "src/index.tsx";

  bunInstallFlags = [ "--linker=hoisted" ];

  postInstall = ''
    wrapProgram $out/bin/${pname} \
      --prefix PATH : ${feed-updater}/bin
  '';
}
