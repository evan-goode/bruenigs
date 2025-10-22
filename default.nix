{
  pkgs,
  mkBunDerivation,
  feed-updater,
  ...
}:
mkBunDerivation rec {
  pname = "bruenigs";
  version = "0.1.0";

  nativeBuildInputs = with pkgs; [
    makeWrapper
  ];

  src = ./.;

  bunNix = ./bun.nix;

  index = "src/index.tsx";

  postInstall = ''
    wrapProgram $out/bin/${pname} \
      --prefix PATH : ${feed-updater}/bin
  '';
}
