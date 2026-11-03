(() => {
  "use strict";
  const source = window.FAMILY_VIDEO_URL;
  if (typeof source !== "string" || !source.startsWith("https://")) return;
  const frame = document.getElementById("video-frame");
  const launch = document.getElementById("video-launch");
  if (!frame || !launch) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = launch.className;
  button.setAttribute("aria-label", launch.getAttribute("aria-label"));
  while (launch.firstChild) button.append(launch.firstChild);
  launch.replaceWith(button);
  button.addEventListener("click", () => {
    const player = document.createElement("video");
    player.controls = true;
    player.playsInline = true;
    player.preload = "metadata";
    player.poster = "family-video.jpg";
    player.setAttribute("aria-label", "Christmas Tamales family film");
    player.setAttribute("tabindex", "0");
    player.src = source;
    frame.replaceChildren(player);
    player.focus();
    player.play().catch(() => {});
  }, { once: true });
})();
