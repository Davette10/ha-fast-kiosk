# Scrypted link (Oct 1, 2026, evening)

Supersedes the "Recorder cameras" stream URLs and the "HA can't reach ZimaOS" blocker in the other docs.

- **Connectivity:** Home Assistant can now reach ZimaOS at 192.168.6.170 (the user fixed this). Scrypted 0.147.0 runs there: http `:11080`, https `:10443` (self-signed; the browser pane can't load it, use `:11080`). The browser pane already has a signed-in Scrypted session.
- **Scrypted devices:** Front Door = device 27 (doorbell), Downstairs = device 28 (camera). Scrypted NVR is **not** installed.
- **Recorder cameras now pull from Scrypted's RTSP rebroadcast** instead of ring-mqtt, so HA and HomeKit share one Ring stream:
  - `camera.front_door_rec` (entry `01M3WV99W2EFDP72EQDR7DNNY1`) → `rtsp://192.168.6.170:46791/0c4c7783a0c00075`
  - `camera.downstairs_rec` (entry `01M3WV8FM6Z5H4Z9GW0X6Q6EE2`) → `rtsp://192.168.6.170:44557/203bbc5aa5cb805c`
  - Fallback (ring-mqtt): `rtsp://03cabcc9-ring-mqtt:8554/cc3bfb471de0_live` (front door), `.../cc3bfbb9d552_live` (downstairs).
  - The rebroadcast ports/paths are Scrypted settings; if clips stop, check they haven't changed (device page → Streams).
- **Verified:** both recorders record through Scrypted. The front door automation was run once by hand and saved `front_door/20261001_202944.mp4` + `.jpg`.
- **Two-way talk and Scrypted's own HA cards** (`custom:scrypted-nvr-camera` with `microphoneOn`, events carousel) require the paid Scrypted NVR plugin plus the `koush/ha_scrypted` custom component (HACS custom repo, HA restart, then the user enters a Scrypted admin username/password at host `192.168.6.170:10443`). Not installed.
- **Scrypted shows "Recorded Clips"** per camera (Ring cloud clips via the Ring plugin). They are only reachable through Scrypted's authenticated API, not from HA today.
