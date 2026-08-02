# Uhura language atlas research ledger

Last updated: 2026-08-02

## Purpose

Build `/map` as an auditable atlas of language technology coverage: a complete language inventory with per-language links to evaluations, datasets, speech resources, and community projects.

The atlas deliberately does **not** assign a universal `low-resource: true/false` label. “Low-resource” is contextual and multidimensional: a language can have substantial written text but little speech data, a translation benchmark but no safety evaluation, or resources in one script and none in another. The interface therefore reports observed coverage and gaps by modality instead of treating resource status as an intrinsic property of a language.

## Canonical identity model

- Primary identity: Glottocode.
- Interoperability code: ISO 639-3 where Glottolog supplies one.
- Geography: representative Glottolog coordinates, not a claim about political borders or the full geographic extent of a speech community.
- Family and macroarea: Glottolog CLDF.
- Language variants and scripts: retained in source benchmark names; collapsed to an ISO 639-3 language only for map aggregation.
- Macrolanguage codes: never silently expanded to every daughter language. Ambiguous mappings remain unmatched until explicitly reviewed.

## Coverage model

Each linked resource records:

- domain: `text`, `translation`, `speech`, `multimodal`, or `community`;
- kind: benchmark, dataset/corpus, model/resource, or community collection;
- tasks, such as question answering, truthfulness, machine translation, ASR, NER, or language identification;
- source URL and provenance tier;
- the language code used to join the resource to the inventory.

Absence from the catalogue means **not yet observed in these sources**, not proof that no resource exists.

## Primary sources in the generated atlas

| Source                                                                       | Use                                                                                              | Current snapshot                | Notes                                                                                           |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------- | ----------------------------------------------------------------------------------------------- |
| [Glottolog CLDF](https://github.com/glottolog/glottolog-cldf)                | Language names, Glottocodes, ISO 639-3, family, macroarea, countries, representative coordinates | `master`, generated 2026-08-02  | Geographic backbone; includes languages without ISO codes.                                      |
| [FLORES-200](https://github.com/facebookresearch/flores/tree/main/flores200) | Machine-translation evaluation coverage                                                          | official README                 | Script variants collapse to the same ISO 639-3 language on the globe.                           |
| [Belebele](https://github.com/facebookresearch/belebele)                     | Reading-comprehension evaluation coverage                                                        | official README                 | 122 variants / 115 distinct languages in the project documentation.                             |
| [Uhura](https://arxiv.org/abs/2412.00948)                                    | Scientific QA and truthfulness evaluation                                                        | paper + Masakhane dataset cards | Corrected to two tasks in six languages: Amharic, Hausa, Northern Sotho, Swahili, Yoruba, Zulu. |
| [FLEURS](https://huggingface.co/datasets/google/fleurs)                      | ASR, speech language ID, speech/text retrieval and translation                                   | official Google dataset card    | 102 languages.                                                                                  |
| [Common Voice release metadata](https://github.com/common-voice/cv-dataset)  | Scripted-speech hours, validated hours and contributor counts                                    | v26.0, cutoff 2026-06-12        | 294 locale releases; matched to ISO 639-3 conservatively.                                       |
| [Uhura Crowd](https://github.com/generalpurposelab/uhuracrowd)               | Lead catalogue for additional multilingual NLP resources                                         | public prototype, May 2026      | Useful discovery layer, but corrected/validated where primary manifests are available.          |
| [Natural Earth via World Atlas](https://github.com/topojson/world-atlas)     | Filled vector land and country outlines for the globe                                            | Natural Earth 1:110m            | Public-domain basemap geometry; it does not assert language territories.                        |

## Research and community directories linked from the page

- [Richard Littauer’s low-resource-languages directory](https://github.com/RichardLitt/low-resource-languages)
- [Masakhane](https://www.masakhane.io/)
- [Lacuna Fund language resources](https://lacunafund.org/language/)
- [David Ifeoluwa Adelani’s publications](https://arxiv.org/a/adelani_d_1.html)
- [Sara Hooker’s research](https://scholar.google.com/citations?user=2M8jvJMAAAAJ)
- [Mozilla Common Voice](https://commonvoice.mozilla.org/)

## Known limitations and review queue

- ISO 639 macrolanguages (`ara`, `orm`, `msa`, `zho`, and similar) require source-specific interpretation. The generator only applies explicit reviewed mappings.
- A benchmark listed for a language does not imply equal data quality, sample count, dialect coverage, licensing, or model performance.
- Glottolog coordinates are representative points. They do not represent borders, diaspora communities, multilingualism, or territorial ownership.
- Filled polygons on the globe are land and country shapes from Natural Earth, not language boundaries. Language records remain representative location marks because no complete, reliable open polygon set exists for all 8,618 entries.
- “All languages” means all Glottolog entries at level `language` in the pinned snapshot. It cannot guarantee discovery of every emerging dataset or community resource.
- Community catalogue links should be periodically checked for moved or archived repositories.
- The next high-value additions are per-language licensing, dataset size for non-Common-Voice resources, and model performance results by benchmark.

## Acceptance checks

- [x] Every Glottolog language appears in the table, including entries without ISO 639-3.
- [x] Every geocoded language can appear on the globe.
- [x] Map and table share the same search/filter state.
- [x] Text/LLM, translation, and speech are visually distinct.
- [x] Resource links open the primary project or paper.
- [x] Uhura is represented as two tasks in six languages.
- [x] Common Voice shows validated hours, not just a binary badge.
- [x] Keyboard, reduced-motion, narrow-screen, typecheck, lint, and production build checks pass.

## Generated snapshot summary

- 8,618 Glottolog language-level entries.
- 8,304 entries with representative coordinates.
- 7,872 entries with an ISO 639-3 code or a mapped standard-variety code.
- 60 linked benchmarks, corpora, models, and resource collections.
- 400 languages with at least one observed resource in the indexed sources.
- 225 with text/LLM coverage, 198 with translation coverage, and 298 with speech coverage.
- Common Voice v26: 294 locale releases, 42,388 total hours, 28,893 validated hours; 282 locales conservatively matched to atlas languages.
- Browser-verified search, profile selection, Uhura linking, voice filters, methodology sources, table view, and 390 px layout with no horizontal overflow.
- Globe basemap uses filled SVG vector land geometry with country outlines; language coordinates remain a separate interactive canvas layer.
- Generated JSON: 2.32 MB raw / approximately 412 KB gzip.
