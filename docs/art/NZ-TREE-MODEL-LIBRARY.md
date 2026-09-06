# New Zealand Tree Model Library

**Status:** standalone art library  
**Branch:** `feature/nz-tree-model-library`  
**Base:** latest `3d-port` at branch creation

This pass creates reusable low-poly 3D tree models. It deliberately does **not** place or substitute them in any course. A later track-specific pass can decide species mix, density, scale, terrain position, collision behaviour and performance strategy.

## Art direction

The existing roadside trees are cheap instanced placeholders. This library instead uses species-level silhouette cues that should remain recognisable from the chase camera and on a landscape phone.

Shared rules:

- actual Three.js geometry; no generated images, sprites, textures or imported models
- flat, warm, slightly faded materials
- broad readable masses instead of individual leaves
- roots at local ground level (`y = 0`)
- built-in restrained contact shadows
- three deterministic variants per species
- no random-number use
- metadata for nominal height, width and suggested collision radius
- optional flowers where colour is part of the species identity

## Research conclusions

### Pōhutukawa

The important game silhouette is not “a round green tree.” It is a broad, low, wind-shaped coastal crown with gnarled branching and a visible summer scatter of crimson flowers. DOC describes pōhutukawa as the New Zealand Christmas tree, while its coastal resilience and low-hanging branches support the wide, sheltering form used here.

Model cues:

- three forked trunks
- laterally stretched, uneven canopy pads
- wind-direction variants
- optional red flower clusters

### Tī kōuka / cabbage tree

DOC and Te Ara identify tī kōuka as one of the most distinctive New Zealand landscape trees. The long narrow leaves form separate rosettes, and the trunk repeatedly branches after flowering.

Model cues:

- tall cork-coloured trunk
- two, three or five separate crowns
- long tapered blade geometry with downward sweep
- sparse open silhouette rather than a palm-like solid canopy

### Kōwhai

Kōwhai is best recognised by an open branching structure and brilliant yellow spring flowers. DOC also notes the twisted and tangled juvenile branching of some species.

Model cues:

- visible crooked limbs through a broken canopy
- light, airy foliage clusters
- optional hanging yellow flower forms

### Tōtara

Tōtara is a massive native podocarp with a strong trunk, stout spreading branches, stringy bark and very dark foliage. It should read as a dense, established native tree rather than an ornamental pine.

Model cues:

- thick upright trunk
- irregular layered branch whorls
- dense dark crown with a broad upper mass
- deliberately less geometric than the Norfolk pine

### Kānuka

DOC distinguishes kānuka by its potential tree height and long strips of bark. At game scale, its useful identity is a light, fine-textured multi-stem tree rather than another heavy canopy blob.

Model cues:

- three slender pale stems
- airy separated crown wisps
- optional tiny cream flower flecks

### Rimu

DOC describes rimu as a tall lowland podocarp with unmistakable olive-green drooping foliage. That hanging foliage is the primary silhouette cue.

Model cues:

- tall tapering trunk
- repeated horizontal limb tiers
- pendant foliage curtains below the limbs
- narrow upper spire

### Norfolk Island pine

Norfolk Island pine is exotic in New Zealand but historically important to Eastbourne's seaside character. A local historical account identifies Eastbourne plantings dating from about 1911–1913. Botanical descriptions consistently emphasise a single upright trunk, a narrow pyramidal or columnar crown and regularly separated horizontal whorls of four to seven branches—typically five.

The model therefore avoids a generic solid conifer cone.

Model cues:

- tall single trunk
- seven or eight visibly separated tiers
- exactly five principal arms per tier
- fine comb-like foliage crossing each arm
- young symmetrical and older narrower variants

## Asset catalogue

| ID | Model | Nominal height | Nominal width | Suggested collision radius |
|---|---|---:|---:|---:|
| `pohutukawa` | Pōhutukawa | 270 | 390 | 68 |
| `tiKouka` | Tī kōuka | 350 | 180 | 30 |
| `kowhai` | Kōwhai | 275 | 285 | 48 |
| `totara` | Tōtara | 365 | 245 | 48 |
| `kanuka` | Kānuka | 260 | 220 | 38 |
| `rimu` | Rimu | 450 | 240 | 44 |
| `norfolkPine` | Norfolk Island pine | 540 | 250 | 38 |

Dimensions are canonical game-art units, not botanical real-world scale. Placement code should scale them relative to Beryl, camera distance and the surrounding landmark composition.

## API

```js
import {
  NZ_TREE_CATALOG,
  buildNzTreeAsset,
  buildPohutukawa,
  buildNorfolkPine,
} from './render3d/trees.js';

const coastalTree = buildPohutukawa({
  variant: 1,
  flowered: true,
  scale: 0.9,
});

const pine = buildNorfolkPine({ variant: 2 });
const selected = buildNzTreeAsset('tiKouka', { variant: 0 });
```

Every returned `Group` includes `userData.treeAsset` with:

- species ID and labels
- variant number
- nominal dimensions
- suggested collision radius

`buildNzTreeShowcase()` creates a review row containing one example of every species. It is not imported or placed by a course.

## Placement work intentionally deferred

A later pass should decide:

- which tracks and landmarks receive each species
- whether common distant vegetation remains instanced
- which hero trees use these detailed groups
- terrain-height and slope alignment
- collision circles or visual-only treatment
- level-of-detail or instancing strategy for repeated models
- seasonal flower use

This separation prevents an art pass from changing deterministic scenery placement or gameplay collisions.

## Research sources

- Department of Conservation — cabbage tree/tī kōuka: https://www.doc.govt.nz/nature/native-plants/cabbage-tree-ti-kouka/
- Department of Conservation — kōwhai: https://www.doc.govt.nz/nature/native-plants/kowhai/
- Department of Conservation — pōhutukawa: https://www.doc.govt.nz/pohutukawa
- Department of Conservation — mānuka and kānuka: https://www.doc.govt.nz/nature/native-plants/manuka-kahikatoa-and-kanuka/
- Department of Conservation — rimu identification: https://www.doc.govt.nz/parks-and-recreation/places-to-go/waikato/places/pirongia-forest-park/things-to-do/mangakara-nature-walk/
- Te Ara — tōtara: https://teara.govt.nz/en/conifers/page-4
- New Zealand Flora — Norfolk Island pine: https://www.nzflora.info/factsheet/taxon/Araucaria-heterophylla.html
- Missouri Botanical Garden — Norfolk Island pine form and branch whorls: https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?isprofile=0&pt=9&taxonid=276635
- Eastbourne Norfolk pine history: https://thelocalarboretum.blog/2025/07/25/sewers-roots-and-sneaky-councils-eastbournes-rimu-street-norfolk-island-pine-saga/
