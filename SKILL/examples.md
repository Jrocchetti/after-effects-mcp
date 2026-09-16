# ae-mcp Examples

Worked recipes using the ae-mcp tools. Every call uses named parameters that match the tool schemas. Adjust names, sizes and timings to the job.

Ask before running anything that changes the whole project (see SKILL.md), and check existing names with `list_compositions` / `list_layers` before editing.

---

## 1. Bouncing ball

```
create_composition(name="Ball", width=1920, height=1080, frameRate=30, duration=5)

add_shape_layer(compName="Ball", name="Ball", shape="ellipse",
                size={"width": 100, "height": 100},
                fillColor={"r": 1, "g": 0.3, "b": 0.2},
                position={"x": 960, "y": 200})

# Drop and bounce - one call per key
set_keyframe(compName="Ball", layerName="Ball", property="position", time=0,   value=[960, 200])
set_keyframe(compName="Ball", layerName="Ball", property="position", time=1,   value=[960, 900])
set_keyframe(compName="Ball", layerName="Ball", property="position", time=1.5, value=[960, 700])
set_keyframe(compName="Ball", layerName="Ball", property="position", time=2,   value=[960, 900])

apply_easy_ease(compName="Ball", layerName="Ball", property="position", type="BOTH")

# Squash on impact
set_keyframe(compName="Ball", layerName="Ball", property="scale", time=0.9, value=[100, 100])
set_keyframe(compName="Ball", layerName="Ball", property="scale", time=1,   value=[120, 80])
set_keyframe(compName="Ball", layerName="Ball", property="scale", time=1.1, value=[100, 100])
```

Alternative - let an expression do the bounce after the last key:

```
apply_expression_template(compName="Ball", layerName="Ball", property="position",
                          template="bounce",
                          params={"amplitude": 0.1, "frequency": 3, "decay": 5})
```

---

## 2. Kinetic typography

```
create_composition(name="Kinetic", width=1920, height=1080, frameRate=30, duration=8)

add_text_layer(compName="Kinetic", name="Word1", text="MOTION", fontSize=120,
               justification="CENTER", position={"x": 960, "y": 400})
add_text_layer(compName="Kinetic", name="Word2", text="DESIGN", fontSize=120,
               justification="CENTER", position={"x": 960, "y": 600})
add_text_layer(compName="Kinetic", name="Word3", text="STUDIO", fontSize=120,
               justification="CENTER", position={"x": 960, "y": 800})

# create_text_animator needs a text layer
create_text_animator(compName="Kinetic", layerName="Word1", animatorType="slideInChars", duration=1, delay=0.05)
create_text_animator(compName="Kinetic", layerName="Word2", animatorType="slideInChars", duration=1, delay=0.05)
create_text_animator(compName="Kinetic", layerName="Word3", animatorType="slideInChars", duration=1, delay=0.05)

# Stagger the words by shifting each layer in time
modify_layer(compName="Kinetic", layerName="Word2", startTime=0.5)
modify_layer(compName="Kinetic", layerName="Word3", startTime=1)
```

---

## 3. Logo reveal with an animated mask

The logo must already be in the project - ask before importing.

```
import_footage(path="C:/Assets/logo.png")                 # confirm with the user first

create_composition(name="Logo", width=1920, height=1080, frameRate=30, duration=4)
add_av_layer(compName="Logo", itemName="logo.png")

# Mask vertices are in the layer's own pixels, (0,0) = top-left.
# For a W x H logo, start with a zero-width rectangle on the left edge...
add_mask(compName="Logo", layerName="logo.png", name="Reveal",
         vertices=[[0, 0], [0, 0], [0, H], [0, H]], feather=40)

# ...and widen it to cover the whole logo.
set_mask_keyframes(compName="Logo", layerName="logo.png", maskName="Reveal",
                   keyframes=[
                     {"time": 0,   "vertices": [[0, 0], [0, 0], [0, H], [0, H]]},
                     {"time": 1.5, "vertices": [[0, 0], [W, 0], [W, H], [0, H]]}
                   ])

apply_effect_template(compName="Logo", layerName="logo.png", template="glow", intensity=50)

set_keyframe(compName="Logo", layerName="logo.png", property="rotation", time=0, value=-5)
set_keyframe(compName="Logo", layerName="logo.png", property="rotation", time=2, value=0)
apply_easy_ease(compName="Logo", layerName="logo.png", property="rotation", type="OUT")
```

For a canned animation instead, `create_logo_reveal(compName="Logo", logoItemName="logo.png", style="scale")`.

---

## 4. Line draw-on with Trim Paths

```
create_composition(name="DrawOn", width=1920, height=1080, frameRate=30, duration=3)

# An open two-point path, centred on the comp
create_path(compName="DrawOn", name="Line", pathName="Stroke Path",
            vertices=[[-400, 0], [400, 0]], closed=false,
            strokeColor={"r": 1, "g": 1, "b": 1}, strokeWidth=6)

add_shape_operator(compName="DrawOn", layerName="Line",
                   operator="trimPaths", properties={"end": 0})

# The operator lives inside the group's Contents - note the slashes
set_keyframe(compName="DrawOn", layerName="Line",
             property="Contents/Group 1/Contents/Trim Paths 1/End", time=0, value=0)
set_keyframe(compName="DrawOn", layerName="Line",
             property="Contents/Group 1/Contents/Trim Paths 1/End", time=1, value=100)
apply_easy_ease(compName="DrawOn", layerName="Line",
                property="Contents/Group 1/Contents/Trim Paths 1/End", type="BOTH")
```

For a curve, add tangents (relative to each vertex). A circle of radius 100:

```
vertices    = [[0, -100], [100, 0], [0, 100], [-100, 0]]
inTangents  = [[-55, 0], [0, -55], [55, 0], [0, 55]]
outTangents = [[55, 0], [0, 55], [-55, 0], [0, -55]]
```

---

## 5. Extruded 3D title

```
create_composition(name="Title3D", width=1920, height=1080, frameRate=30, duration=5)
add_text_layer(compName="Title3D", name="Title", text="LAUNCH", fontSize=200,
               justification="CENTER", position={"x": 960, "y": 540})

get_3d_info(compName="Title3D")                    # new comps start on the Classic renderer
set_comp_renderer(compName="Title3D", renderer="advanced")

set_3d_layer(compName="Title3D", layerName="Title", enable3D=true, orientation=[0, 20, 0])
set_geometry_options(compName="Title3D", layerName="Title",
                     extrusionDepth=60, bevelStyle=2, bevelDepth=4)
set_material_options(compName="Title3D", layerName="Title",
                     castsShadows=true, ambient=40, diffuse=70, specularIntensity=55)

add_camera_layer(compName="Title3D", name="Cam", type="TWO_NODE")
set_camera_options(compName="Title3D", layerName="Cam",
                   zoom=1200, depthOfField=true, focusDistance=1200, aperture=40)

add_light_layer(compName="Title3D", name="Key", type="SPOT")
set_light_options(compName="Title3D", layerName="Key",
                  intensity=120, color={"r": 1, "g": 0.9, "b": 0.7},
                  coneAngle=70, coneFeather=40, castsShadows=true, shadowDarkness=60)
```

Read the `failed` list in each `set_*_options` result. Under the `advanced` renderer, for example, camera `blurLevel` and the iris controls are refused, and each failure names the renderer that supports it.

---

## 6. Number counter

```
create_composition(name="Counter", width=1920, height=1080, frameRate=30, duration=5)
add_text_layer(compName="Counter", name="Count", text="0", fontSize=200,
               justification="CENTER", position={"x": 960, "y": 540})

set_expression(compName="Counter", layerName="Count", property="sourceText",
               expression="Math.round(linear(time, 0, 3, 0, 1000)).toString()")
```

For a prefix or suffix: `"$" + Math.round(linear(time, 0, 3, 0, 1000)).toString()`.

---

## 7. Parallax with a controller null

`link_properties` can only *add* an offset, so parallax uses an expression with a multiplier.

```
add_null_layer(compName="Scene", name="Camera Control")

# Each layer moves by a fraction of the controller's motion.
# 0.2 = far background, 0.5 = midground, 1.0 = foreground.
set_expression(compName="Scene", layerName="Background", property="position",
  expression='var c = thisComp.layer("Camera Control").transform.position; value + (c - c.valueAtTime(0)) * 0.2')
set_expression(compName="Scene", layerName="Midground", property="position",
  expression='var c = thisComp.layer("Camera Control").transform.position; value + (c - c.valueAtTime(0)) * 0.5')

# Animate only the controller
set_keyframe(compName="Scene", layerName="Camera Control", property="position", time=0,  value=[960, 540])
set_keyframe(compName="Scene", layerName="Camera Control", property="position", time=10, value=[560, 540])
```

---

## 8. Glitch title

There is no duplicate-layer tool, so build the three copies directly.

```
create_composition(name="Glitch", width=1920, height=1080, frameRate=30, duration=4)

add_text_layer(compName="Glitch", name="Red",   text="GLITCH", fontSize=150,
               justification="CENTER", color={"r": 1, "g": 0, "b": 0}, position={"x": 950, "y": 540})
add_text_layer(compName="Glitch", name="Green", text="GLITCH", fontSize=150,
               justification="CENTER", color={"r": 0, "g": 1, "b": 0}, position={"x": 960, "y": 540})
add_text_layer(compName="Glitch", name="Blue",  text="GLITCH", fontSize=150,
               justification="CENTER", color={"r": 0, "g": 0, "b": 1}, position={"x": 970, "y": 540})

# Blend modes are AE constants in capitals
modify_layer(compName="Glitch", layerName="Red",  blendMode="SCREEN")
modify_layer(compName="Glitch", layerName="Blue", blendMode="SCREEN")

apply_effect(compName="Glitch", layerName="Green", effect="Turbulent Displace")

# Flicker
apply_expression_template(compName="Glitch", layerName="Red", property="opacity",
                          template="wiggle", params={"frequency": 12, "amplitude": 40})
```

---

## 9. Render and deliver

```
list_render_templates()        # use the user's existing presets by name

add_to_render_queue(compName="Title3D",
                    outputPath="D:/Deliveries/Title3D.mp4",
                    renderSettingsTemplate="Best Settings",
                    outputModuleTemplate="H.264 - Match Render Settings - 15 Mbps")

list_render_queue()            # confirm status "queued" and the real outputPath

queue_in_ame(renderImmediately=true)     # returns immediately; AME does the encoding
```

Avoid `control_render(action="start")` for anything long - it blocks After Effects until the queue finishes, and the call will time out.

---

## Timing and easing

| Use | Duration | Easing |
|---|---|---|
| UI elements, buttons | 0.3 s | Easy ease both ways |
| Text and image reveals | 0.8-1.2 s | Ease out |
| Logos, call-to-action | 0.4-0.6 s | `overshoot` or `bounce` expression |
| Ambient loops | 2-4 s | Linear, or `loopCycle` |
