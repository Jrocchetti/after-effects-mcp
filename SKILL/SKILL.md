---
name: ae-mcp
description: Drive Adobe After Effects through the ae-mcp tools. Use when the user wants to create, edit, animate or render anything in After Effects - compositions, text, shape layers and bezier paths, trim paths and other shape operators, masks, keyframes and easing, expressions, effects, 3D layers with cameras, lights and extrusion, lower thirds, title cards, transitions, logo reveals, markers, and the render queue or Adobe Media Encoder. Trigger on phrases like "in After Effects", "make a motion graphic", "animate this", "add keyframes", "draw on a line", "mask this", "extrude the text", "render this comp", or AE terms like comp, precomp, expression, trim paths, render queue.
---

# After Effects MCP

These tools send ExtendScript to After Effects through a CEP panel. **The AE-MCP panel must be open** (Window > Extensions > AE-MCP). If every call times out, ask the user to open it.

For worked recipes, read `examples.md` in this skill.

## Before you act

- **Ask before calling tools that change the open project as a whole**: `save_project`, `close_project`, `open_project`, `create_project`, `reduce_project`, `collect_files`, `organize_project_items`, `import_footage`, `import_folder`, `replace_footage`. The user usually has real work open.
- **Look before you edit.** Call `list_compositions`, `list_layers` or `get_layer_info` rather than guessing names.
- **Every tool call is one undo step**, named for the operation ("Undo Create Lower Third"). Prefer a few purposeful calls over many tiny ones, so the user can undo cleanly.
- Times are in **seconds**. Colours are **0-1** RGB objects: `{"r": 1, "g": 0.5, "b": 0}`.

## Property paths

Keyframe, expression and effect-property tools take a `property` string.

**1. Prefer the camelCase shortcuts.** They resolve to internal match names, so they also work on non-English installs:

| Shortcut | Property |
|---|---|
| `position`, `anchorPoint`, `scale`, `opacity` | Transform |
| `rotation` | Rotation (Z rotation on 3D layers) |
| `rotationX`, `rotationY`, `rotationZ` | 3D rotation |
| `sourceText` | Text layer Source Text |
| `audioLevels` | Audio levels |

English display names (`"Position"`, `"Rotation"`, `"Source Text"`) also work on an English install.

**2. For nested properties, separate levels with `/` - never `.`.**

```
Effects/Gaussian Blur/Blurriness
Effects/Gradient Ramp/Start Color
Contents/Group 1/Transform/Position
Contents/Group 1/Contents/Trim Paths 1/End
```

A dotted path such as `Effects.Gaussian Blur.Blurriness` is looked up as one property with that literal name and fails with "Property not found".

**3. Shape groups created by these tools are named `Group 1`**, not `Shape 1` (that name only appears on shapes drawn by hand with the Pen tool). Operators live *inside* the group's `Contents`, so Trim Paths is `Contents/Group 1/Contents/Trim Paths 1/...`.

For camera, light and material properties, use the dedicated `set_*_options` tools instead of paths - they report which properties the current renderer refused.

## Value formats

| Property | Format |
|---|---|
| Position | `[960, 540]`, `[x, y, z]` on 3D layers, or `{"x": 960, "y": 540}` |
| Scale | `[100, 100]` (percent) |
| Rotation | `45` (degrees) |
| Opacity | `100` (0-100) |
| Shape fill / stroke colour | `{"r", "g", "b"}` |
| Effect colour parameter via `set_keyframe` | `[r, g, b, a]`, 0-1 |

**Enum values are After Effects constants, in capitals.** `modify_layer` `blendMode` takes `NORMAL`, `SCREEN`, `MULTIPLY`, `ADD`, `OVERLAY` and so on - `"Screen"` fails with "Value is undefined". Text `justification` is `LEFT` / `CENTER` / `RIGHT`; `apply_easy_ease` `type` is `IN` / `OUT` / `BOTH`.

## Tool map

| Area | Tools |
|---|---|
| Project | `get_project_info`, `list_project_items`, `find_missing_footage`, `set_proxy`, `remove_proxy`, plus the project-wide tools listed under "Before you act" |
| Compositions | `create_composition`, `modify_composition`, `duplicate_composition`, `delete_composition`, `list_compositions`, `get_composition_info`, `get_comp_report`, `set_active_composition`, `set_work_area`, `render_frame` |
| Layers | `add_solid_layer`, `add_text_layer`, `add_text_layer_advanced`, `add_shape_layer`, `add_null_layer`, `add_adjustment_layer`, `add_camera_layer`, `add_light_layer`, `add_av_layer`, `modify_layer`, `delete_layer`, `list_layers`, `get_layer_info`, `precompose_layers` (see Known issues) |
| Shape paths | `create_path`, `get_path`, `set_path_keyframes`, `add_shape_operator` |
| Masks | `add_mask`, `list_masks`, `get_mask_path`, `set_mask_path`, `set_mask_keyframes`, `set_mask_properties`, `delete_mask` |
| 3D | `set_comp_renderer`, `get_3d_info`, `set_3d_layer`, `set_material_options`, `set_geometry_options`, `set_camera_options`, `set_light_options` |
| Keyframes | `set_keyframe`, `set_keyframe_advanced`, `get_keyframes`, `apply_easy_ease`, `set_temporal_ease`, `offset_keyframes`, `scale_keyframe_timing`, `reverse_keyframes`, `copy_keyframes` |
| Expressions | `set_expression`, `get_expression`, `remove_expression`, `enable_expression`, `batch_set_expressions`, `add_expression_control`, `apply_expression_template`, `link_properties` |
| Effects | `apply_effect`, `apply_effect_template`, `modify_effect_properties`, `remove_effect`, `reorder_effects`, `copy_effects`, `list_effects` |
| Templates | `create_lower_third`, `create_title_card`, `create_transition`, `create_logo_reveal`, `create_text_animator` |
| Markers and time | `add_composition_marker`, `add_layer_marker`, `get_markers`, `delete_marker`, `get_current_time`, `set_current_time`, `snap_to_marker`, `get_nearest_marker`, `navigate_markers` |
| Render | `add_to_render_queue`, `list_render_queue`, `list_render_templates`, `set_render_queue_item`, `remove_from_render_queue`, `control_render`, `queue_in_ame` |

**Not available** - say so rather than improvising: duplicating a layer, time remapping, the motion-blur switch, track mattes, layer styles, and setting gradient colours.

## Keyframes

- `set_keyframe` - value at a time. `set_keyframe_advanced` adds `inType` / `outType` (`LINEAR`, `BEZIER`, `HOLD`) and `inEase` / `outEase` as `{"speed": 0, "influence": 33}`.
- `apply_easy_ease` - `keyframeIndex` for one key, omit it for all. Works on Position.
- `set_temporal_ease` - `keyframeIndex`, `inSpeed`, `inInfluence`, `outSpeed`, `outInfluence`.
- `offset_keyframes` - `offset` in seconds. Refuses, changing nothing, if any key would move before 0.
- `scale_keyframe_timing` - **`scale`** (must be > 0; 2 doubles the timing) and optional `anchorTime`. Refuses if keys would move before 0 or merge onto one frame.
- `copy_keyframes` - `sourceLayerName`, `sourceProperty`, `targetLayerName`, `targetProperty`, `timeOffset`.

If one of these refuses with "Nothing was changed", the keyframes are untouched - fix the input and retry.

## Shape layers and paths

- `add_shape_layer` - `shape`: `rectangle` (supports `roundness`), `ellipse`, `polygon`, `star` (`points`, `outerRadius`, `innerRadius`).
- `create_path` - a real editable bezier path. `vertices` are `[x, y]` points relative to the layer, which the tool places at the comp centre. **`inTangents` / `outTangents` are relative to their own vertex**, not absolute. Omit them for corner points. `closed: false` for an open line.
- `set_path_keyframes` - each keyframe carries its own full vertex list. Keep the vertex count the same between keys for clean morphing.
- `add_shape_operator` - `operator` is one of `trimPaths`, `repeater`, `roundCorners`, `zigZag`, `twist`, `puckerBloat`, `offsetPaths`, `wigglePaths`, `wiggleTransform`, `mergePaths`, `gradientFill`, `gradientStroke`. Set values with friendly keys, for example `{"start": 0, "end": 50}` for trim paths or `{"copies": 6}` for a repeater. To animate an operator, keyframe it through its path (see Property paths).
- **Gradient colour stops cannot be set by script.** After Effects exposes them as read-only, so gradients render with default colours. Tell the user to set the colours by hand.

## Masks

- `add_mask` - optional `vertices` / tangents in the layer's own pixel space, where `(0, 0)` is the layer's **top-left** corner. Also `mode` (`none`, `add`, `subtract`, `intersect`, `lighten`, `darken`, `difference`), `inverted`, `feather` (pixels), `opacity`, `expansion`.
- `set_mask_keyframes` animates the path; `set_mask_properties` changes settings and works through a lock.
- Identify masks by `maskName` or 1-based `maskIndex`. With neither, the first mask is used.

## 3D

1. **Check the renderer first** with `get_3d_info`. New comps use the Classic renderer. Its internal name is `ADBE Advanced 3d` - that is *not* Advanced 3D.
2. `set_comp_renderer` takes `classic`, `advanced` or `cinema4d`. Each exposes a **different** set of properties; newer is not simply better:

| Feature | classic | advanced | cinema4d |
|---|---|---|---|
| Extrusion and bevel | no | yes | yes |
| Camera blur level, iris, highlights | yes | no | no |
| Depth of field, focus distance, aperture | yes | yes | no |
| Shadow colour, focus area width | no | yes | no |
| Reflections | no | no | yes |

3. `set_3d_layer` with `enable3D: true` before setting 3D properties.
4. Extrusion (`set_geometry_options` `extrusionDepth`, `bevelDepth`, `bevelStyle`) works on **text and shape layers only**, never solids.
5. The `set_*_options` tools apply what they can and return `applied` and `failed`. Each failure lists `availableUnderRenderers`. Read it and switch renderer, or tell the user the property isn't available - don't assume the call fully succeeded.

## Templates

- `create_lower_third` - `style` (`modern`, `corporate`, `news`, `minimal`, `social`), `position` (`bottomLeft`, `bottomRight`, `bottomCenter`). **`name` is the name of the precomp it builds**; `title` is the main line and `subtitle` the second. It adds one precomp layer to the target comp.
- `create_title_card` - `style`: `cinematic`, `documentary`, `social`, `minimal`.
- `create_transition` - `type`: `wipe_left`, `wipe_right`, `wipe_up`, `wipe_down`, `dissolve`, `push`, `slide`, `zoom`; `easing`: `linear`, `easeIn`, `easeOut`, `easeInOut`.
- `create_logo_reveal` - needs an **already imported** logo (`logoItemName` or `logoItemId`). `style`: `fade`, `scale`, `slide`, `spin`, `glitch`. Avoid `particle`: it is listed but not implemented, so the logo gets no animation.
- `create_text_animator` - needs a text layer (`layerName`); `animatorType`: `typewriter`, `fadeInChars`, `scaleInChars`, `slideInChars`, `randomize`, `wave`; optional `duration`, `delay`.

## Effects and expressions

- `apply_effect` - `effect` is the effect's English name (`"Gaussian Blur"`, `"Glow"`, `"Gradient Ramp"`, `"Turbulent Displace"`).
- `apply_effect_template` - `template`: `gaussianBlur`, `directionalBlur`, `glassBlur`, `curves`, `colorBalance`, `brightnessContrast`, `vibrance`, `glow`, `dropShadow`, `vignette`, `cinematicLook`, `vhsRetro`, `neonGlow`, `filmGrain`, `chromaticAberration`, `duotone`; optional `intensity`.
- `apply_expression_template` - `template`: `wiggle`, `wiggleSmooth`, `wiggleFadeIn`, `wiggleFadeOut`, `loopCycle`, `loopPingpong`, `loopOffset`, `loopContinue`, `time`, `clock`, `countdown`, `frameNumber`, `matchPosition`, `offsetPosition`, `inverseRotation`, `followPath`, `bounce`, `inertia`, `overshoot`, `springy`. Pass settings in `params`: `wiggle` takes `frequency` and `amplitude`; `bounce` takes `amplitude`, `frequency` and `decay`; `springy` takes `mass`, `stiffness` and `damping`. Unknown keys are ignored.
- `link_properties` - `offset` is **added** to the linked value. It shifts a layer; it cannot scale motion. For parallax or other multipliers, write the expression with `set_expression`.
- In your own expressions, use `value` for the pre-expression value and `thisComp.layer("Name")` to reference other layers.

## Rendering

- Call `list_render_templates` first and use the user's existing presets by name.
- `add_to_render_queue` - `outputPath`, `renderSettingsTemplate`, `outputModuleTemplate`, `timeSpanStart`, `timeSpanDuration`. **The output module decides the file type**: a `.mov` path with an H.264 module produces `.mp4`. Report the returned `outputPath`.
- **`control_render` with `action: "start"` blocks After Effects until the whole queue finishes**, so the call will usually time out on a real render. Prefer `queue_in_ame` (`renderImmediately: true` to start encoding), which returns straight away. Poll `list_render_queue` for status.
- `render_frame` saves a single still, which is useful for checking your work.

## Known issues

- **`precompose_layers` is broken.** It moves the layers into the new precomp and then errors. If you must use it, check the result with `list_layers` afterwards.
- `delete_composition` does not delete the solids that comp used. They stay in the project's Solids folder.
- `create_logo_reveal` style `particle` does nothing (see Templates).

## Common errors

| Error | Likely cause |
|---|---|
| Timeout on every call | AE-MCP panel closed, or a modal dialog open in After Effects |
| "Property not found" | Dotted path, wrong group name (`Group 1`, not `Shape 1`), or the property doesn't exist on this layer type |
| "property or a parent property is hidden" | Renderer doesn't support it (see 3D), layer isn't 3D, or you asked for extrusion on a solid |
| "Value is undefined" | Enum written in the wrong case, such as `"Screen"` instead of `SCREEN` |
| "Unknown expression template" | Name not in the template list, such as `randomize`, which is a text animator type |
| "Nothing was changed" | A keyframe tool refused input that would have lost keys; nothing was modified |
| "Composition not found" / "Layer not found" | Check exact names with `list_compositions` / `list_layers` |
| File couldn't be saved | Use a full absolute path with forward slashes, such as `C:/Projects/job.aep` |

## Timing guidelines

- UI elements: 0.3-0.5 s. Text reveals: 0.5-1.5 s. Logo animations: 1-3 s. Title cards: 3-5 s. Transitions: 0.5-1.5 s.
- Natural motion: easy ease both ways. Entrances: ease out. Exits: ease in. Loops: linear.
- Common comp sizes: 1920x1080 landscape, 1080x1920 vertical, at 24, 30 or 60 fps.
