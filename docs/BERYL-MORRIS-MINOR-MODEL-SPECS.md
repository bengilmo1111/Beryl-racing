# Beryl Racing — Morris Minor Reference Model Specifications

**Source:** `Morris_Minor.zip` supplied for the Beryl Racing 3D car revision  
**Reference files:** `Morris Minor.blend`, `Morris Minor.fbx`, and associated 4K PBR textures  
**Game implementation:** `feature/model-informed-cute-beryl`, branched from `3d-port`  
**Purpose:** Record the useful dimensions, proportions, silhouette cues, and translation decisions taken from the detailed model when redesigning Beryl as a cute low-poly game car.

---

## 1. Important scale caveat

The detailed model is **not authored at believable real-vehicle scale**.

The FBX declares centimetres (`UnitScaleFactor = 1.0`), but its transformed scene bounds are approximately:

- **Length:** 751.36 cm
- **Width:** 294.63 cm
- **Overall height:** 294.88 cm

That would make the model about **7.51 m long**, which is much larger than a real Morris Minor. The measurements below are therefore most useful as **relative proportions and placements**, not as real-world Morris Minor specifications.

For the game revision, the detailed asset was used as a shape and proportion reference. Its high-poly geometry and PBR textures were deliberately not imported.

---

## 2. Source asset characteristics

| Item | Value |
|---|---:|
| ZIP archive size | 53,325,649 bytes / 50.86 MiB |
| FBX size | 11,832,156 bytes / 11.28 MiB |
| Blender file size | 35,709,800 bytes / 34.06 MiB |
| Non-empty mesh objects | 9 |
| Total source vertices | 156,499 |
| Total source polygons | 149,987 |
| Approx. triangulated faces | 292,862 |
| Materials | 10 |
| Texture images | 7 |
| Texture resolution | 4096 × 4096 each |

### Texture set

- Body/plating diffuse
- Body/plating metalness
- Wheel base colour
- Wheel height
- Wheel metallic
- Wheel normal
- Wheel roughness

This asset complexity is far above what Beryl needs in the game. The code-built low-poly replacement avoids an approximately 11 MB FBX, nearly 293,000 triangles, and seven 4K textures.

---

## 3. Coordinate system used for measurements

After applying the FBX object transforms:

- **X:** vehicle width, left to right
- **Y:** vertical height
- **Z:** vehicle length
- **+Z:** front of the detailed reference model
- **−Z:** rear of the detailed reference model

The new game model uses the opposite longitudinal convention internally:

- **−Z:** nose/forward
- **+Z:** rear

This sign difference does not change the proportions.

---

## 4. Detailed model bounding dimensions

### 4.1 Main body shell

Measured from the primary `Morris Minor` body mesh.

| Dimension | Model-space value | Metres if read literally |
|---|---:|---:|
| Length | 751.36 cm | 7.514 m |
| Width | 294.63 cm | 2.946 m |
| Body-shell height | 244.68 cm | 2.447 m |
| Body centre along Z | +13.60 cm | — |

Body-shell bounds:

```text
X: -147.315 to +147.315
Y:  +46.973 to +291.656
Z: -362.075 to +389.282
```

### 4.2 Entire scene, including wheels

| Dimension | Model-space value |
|---|---:|
| Length | 751.36 cm |
| Width | 294.63 cm |
| Overall height | 294.88 cm |
| Lowest point | Y = -3.22 cm |
| Highest point | Y = 291.66 cm |

The body is therefore visibly low and broad relative to its total length, with the wheels contributing much of the full vertical envelope.

---

## 5. Wheel and axle measurements

The four wheel meshes have effectively matching dimensions.

| Measurement | Model-space value |
|---|---:|
| Wheel diameter | 116.74 cm |
| Wheel radius | 58.37 cm |
| Wheel width/thickness | 31.26 cm |
| Front axle Z | +238.72 cm |
| Rear axle Z | −185.30 cm |
| Wheel centre X | ±126.17 cm |
| Wheel centre Y | approximately 55.15 cm |
| Wheelbase | 424.02 cm |
| Track width, centre to centre | 252.35 cm |

### Derived placement

| Relationship | Value |
|---|---:|
| Wheelbase / body length | **56.43%** |
| Track / body width | **85.65%** |
| Wheel diameter / body width | **39.62%** |
| Front overhang | 150.56 cm / **20.04%** of length |
| Rear overhang | 176.77 cm / **23.53%** of length |

The slightly longer rear overhang, compact wheelbase, and wheels placed close to the outer body edges are important Morris Minor silhouette cues.

---

## 6. Cabin and glass envelope

The principal window/cabin mesh gives the following useful envelope:

| Measurement | Model-space value | Relative value |
|---|---:|---:|
| Glass/cabin length | 378.42 cm | **50.37%** of body length |
| Glass/cabin width | 257.70 cm | **87.47%** of body width |
| Glass-band height | 78.83 cm | — |
| Cabin centre Z | −37.08 cm | — |
| Rearward offset from body centre | 50.68 cm | **6.75%** of body length |

Window-envelope bounds:

```text
X: -129.147 to +128.557
Y: +182.615 to +261.446
Z: -226.290 to +152.134
```

The cabin is therefore:

- About half the vehicle length.
- Broad relative to the body.
- Shifted modestly toward the rear.
- Separated from a relatively long rounded bonnet.
- Followed by a shorter, pinched boot area.

These relationships were more useful than copying surface detail.

---

## 7. Normalised reference proportions

With detailed-model body length normalised to `1.000`:

| Feature | Normalised value |
|---|---:|
| Length | 1.000 |
| Width | 0.392 |
| Body-shell height | 0.326 |
| Overall height including wheels | 0.393 |
| Wheelbase | 0.564 |
| Track width | 0.336 |
| Wheel diameter | 0.155 |
| Wheel width | 0.042 |
| Front overhang | 0.200 |
| Rear overhang | 0.235 |
| Cabin/glass length | 0.504 |
| Cabin rearward offset | 0.067 |

Other useful ratios:

```text
Length : width                 = 2.550 : 1
Length : body-shell height     = 3.071 : 1
Length : overall height        = 2.548 : 1
Track : body width             = 0.856 : 1
Cabin width : body width       = 0.875 : 1
Wheel diameter : body width    = 0.396 : 1
```

---

## 8. Direct proportional conversion to the game length

Beryl's existing game collision length is **217.6 units**. If the detailed model were scaled uniformly to that length without caricature, it would produce approximately:

| Feature | Direct proportional value |
|---|---:|
| Length | 217.60 |
| Width | 85.33 |
| Body-shell height | 70.86 |
| Overall height | 85.40 |
| Wheelbase | 122.80 |
| Track width | 73.08 |
| Wheel diameter | 33.81 |
| Wheel width | 9.05 |
| Front overhang | 43.60 |
| Rear overhang | 51.19 |
| Cabin length | 109.59 |
| Cabin width | 74.63 |
| Cabin rearward offset | 14.68 |

A literal proportional conversion would look too narrow, delicate, and realistic for the game camera. The final game dimensions intentionally exaggerate width, height, wheel size, and track.

---

## 9. Dimensions used in the new low-poly Beryl

Current implementation in `src/render3d/beryl.js`:

```js
BERYL.width  = 108.8
BERYL.length = 217.6
BERYL.height = 91

WHEEL_R      = width  × 0.205 = 22.304
WHEEL_W      = width  × 0.150 = 16.320
AXLE_FRONT   = length × -0.31 = -67.456
AXLE_REAR    = length × 0.255 = 55.488
AXLE_X       = width  × 0.425 = ±46.240
```

Derived game dimensions:

| Feature | Game value | Game ratio |
|---|---:|---:|
| Length | 217.60 | 1.000 of length |
| Width | 108.80 | 0.500 of length |
| Height | 91.00 | 0.418 of length |
| Wheel diameter | 44.61 | 41.0% of width |
| Wheel width | 16.32 | 15.0% of width |
| Wheelbase | 122.94 | **56.5% of length** |
| Track width | 92.48 | **85.0% of width** |

Height is the one figure that is *not* exaggerated. A real Minor 1000 is
1524 mm tall on 3759 mm of length — a ratio of 0.406 — so 0.418 is close to
literal. Height is what makes a car read as its era, and an over-tall Minor
stops looking like a Minor at all.

### What was preserved

- The detailed model's approximately **56% wheelbase**.
- Wheels close to the outer body edges.
- Rear-biased cabin.
- Long rounded bonnet and shorter boot.
- Broad cabin relative to the body.
- Rounded shoulders and distinct front wings.

### What was deliberately exaggerated

- Width: `108.8` rather than the model-proportional `85.3`.
- Wheel diameter: `44.6` rather than the model-proportional `33.8`.
- Wheel thickness: `16.3` rather than the model-proportional `9.1`.
- Track: `92.5` rather than the model-proportional `73.1`.

These changes make Beryl squatter, broader, sturdier, and more readable from the chase camera while preserving the underlying Morris Minor layout.

---

## 10. Shape cues extracted from the detailed model

The most valuable reference information was qualitative rather than microscopic:

### Body

- Narrower, tapered nose rather than a rectangular front block.
- Rounded shoulder line through the front and rear wings.
- Separate front wings carrying the round headlights.
- Crowned bonnet with a visible centre rise.
- Main body widest around the wheel arches and cabin lower edge.
- Tail narrows and rounds inward rather than ending as a square box.

### Cabin

- Cabin begins behind a substantial bonnet.
- Cabin centre is shifted rearward.
- Roof is high and rounded, but not stretched across the full body length.
- Windscreen and rear screen are visibly sloped.
- Side-glass band is broad, helping the car feel friendly and airy.

### Stance

- Compact wheelbase relative to body length.
- Wheels sit far out toward the body edges.
- Rear overhang is slightly longer than the front overhang.
- Body appears to sit down around the wheels rather than on top of them.

### Identity details retained in simplified form

- Round headlights.
- Vertical front grille.
- Chrome bumpers and bumper overriders.
- Whitewall tyres and chrome hubcaps.
- Small red tail lamps.
- Turquoise body **including the roof** — see §14.
- Thin red side pinstripe.
- Period-style rear plate.

---

## 11. Recommended reusable modelling constraints

For future revisions, replacement meshes, image generation, or Blender work:

1. Keep wheelbase between **55% and 58% of total body length**.
2. Keep the cabin/glass envelope around **48% to 53% of total length**.
3. Place the cabin centre approximately **5% to 8% of length rearward** of the body centre.
4. Keep the rear overhang slightly longer than the front overhang.
5. Put wheel centres at approximately **42% to 44% of body width** from the centreline.
6. For a cute game version, use overall width around **47% to 52% of length**, rather than the detailed model's narrower 39%.
7. For gameplay readability, use wheel diameter around **44% to 48% of body width**.
8. Preserve separate front wings, a rounded bonnet, rearward cabin, and pinched boot before adding small trim details.
9. Avoid a uniform rectangular body section; taper both nose and tail.
10. Do not import the original 4K PBR material stack unless the game's visual direction changes substantially.

---

## 12. Measurement method and limitations

Measurements were extracted directly from the binary FBX by:

1. Reading mesh vertex arrays.
2. Applying each mesh object's local transforms and model hierarchy.
3. Calculating transformed axis-aligned bounding boxes.
4. Using the four wheel mesh centres to derive wheelbase and track.
5. Using the main window mesh as an approximate cabin/glass envelope.

Limitations:

- The source model is not physically scaled.
- Bounding boxes describe envelopes, not engineering dimensions.
- Curved surfaces can make a bounding-box dimension slightly larger than the visually dominant body section.
- The cabin measurement is based on the available window mesh envelope, not a formal roof-pillar measurement.
- Some plating and lamp helper geometry appears baked or duplicated; it was used for visual cues but not for overall dimensional calculations.
- These are art-production measurements, not automotive restoration specifications.

---

## 13. Concise art brief

> Build Beryl as a broad, cheerful, low-poly Morris Minor with a 56% wheelbase, wheels pushed toward the outer edges, a rear-shifted half-length cabin, a long rounded bonnet, separate bulbous front wings, and a pinched rounded boot. Keep her wider, taller, and more generously wheeled than the detailed reference model so she reads clearly and affectionately from the chase camera. Preserve turquoise paint, pale roof, round lamps, chrome bumpers, whitewalls, hubcaps, and the red pinstripe. Do not pursue photorealism.


---

## 14. Corrections from the photograph

The reference FBX gave good *layout* — wheelbase, overhangs, cabin position — but
two things it could not settle were only resolved by measuring
`public/assets/beryl-photo.png`, the actual car. Both had already made it into
the game model and both were wrong.

### 14.1 She has no contrast roof

§10 above listed "turquoise body and pale roof", and the code used a lighter
`berylRoof` for the cabin cap. The photograph shows one uniform turquoise over
the whole car; the roof only looks lighter where it catches the sky. The model
now uses the body colour throughout and lets lighting do the work.

`COLORS.berylRoof` still exists in `src/config.js` and is used elsewhere, so it
was left alone.

### 14.2 Vertical proportions were inverted

Measured off the photograph, as fractions of her total height including wheels:

| Band | Photo | Earlier model |
|---|---:|---:|
| Glass and roof | **29%** | 45% |
| Body side, waist to sill | **50%** | 33% |
| Wheel below the sill | 21% | 22% |

The earlier passes had a shallow body under an oversized glass bubble — the exact
inverse — which is why she kept reading as a low wedge no matter how the cabin
was adjusted. The fix was not a taller cabin but a **much deeper body side**: the
waistline moved from 58 up to 75, with the greenhouse left as a ~32-unit band on
top of it.

Cabin length was already close: the photo puts it at roughly 34%–85% of her
length, and the model spans −0.175L to +0.335L, which is 33%–84%.

### 14.3 Trim has to sit on the bodywork, not at a nominal height

The loft's cross-section is an octagon that pulls inward above the shoulder, so a
constant-height, constant-width trim strip does not follow the surface. The red
pinstripe was placed at the waistline (y 68) where the body is only ~40 wide,
leaving it hanging ~13 units out in mid-air down the whole flank — from the chase
camera it read as a pair of red fins. It now sits on the shoulder crease (y 54),
where the loft is genuinely at full width.

The same mistake had put the bonnet seam above the bonnet and the rear screen
above the roofline. **Any new trim needs checking against the loft's width at the
height it is placed, not just its plan position.**

### 14.4 Pillars must be derived, not hand-placed

Fixed-height pillar boxes overshot the roofline at the sloped ends and stuck out
of the silhouette like roll-bar struts. They are now sized by interpolating the
cabin stations, so they cannot escape the cabin whatever the profile becomes.
