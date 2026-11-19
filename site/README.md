# dolmens.tirnarogue.com

The public website: a home page, the report, the figure plates, the interactive presentation, the restored-dolmen receiver and the Newgrange acoustic 3D model. `build.mjs` makes it from the repository's own files into `publish/`, the only folder that is uploaded:

- **Report:** rendered from `../neolithic-acoustic-signal-network.md`, with a contents list. The draft's repository lines are left out, and the ChatGPT transcript isn't published.
- **Plates:** `../figures/plates/`, captioned from the report's Appendix A.
- **Presentation and receiver:** `../presentation/web/index.html` and `../restored-dolmen/index.html`, with a link back home. The receiver also offers `dolmen-restored.glb`.
- **Newgrange:** `../newgrange/viewer/index.html`, bundled with its 3D models (`.glb`, `.stl`, `.obj`), 3D FDTD eigenmodes, ray-traced paths, 48 kHz impulse responses (`.wav`), and diagnostic plots.
- **Chambers:** `../chambers/viewer/index.html`, comparative 3D observatory & interactive explainers (*The Note in the Stone*) covering Maeshowe, Newgrange, Loughcrew Cairn L, Wayland's Smithy, Chûn Quoit, and Carn Euny with `.glb` downloads and 3D FDTD experiment curves.

Rebuild those two first if their sources changed (`npm run build-web` in `presentation/`, `npm run build` in `restored-dolmen/`).

```sh
npm ci
node build.mjs     # publish/, to look at locally
./publish.sh       # build and deploy to Cloudflare
```

It deploys as the `dolmens` Worker (static assets) on the same Cloudflare account as fianna.tirnarogue.com, with `dolmens.tirnarogue.com` as its custom domain (`wrangler.jsonc`). In a cloud Claude session, `publish.sh` needs `CLOUDFLARE_API_TOKEN` in the environment and `api.cloudflare.com` allowed on its network, as for the Gods and Fighting Men site.
