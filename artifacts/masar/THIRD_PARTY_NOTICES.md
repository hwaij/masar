# Third-Party Notices

This project includes data derived from third-party open-source projects. This
file lists each one, the exact scope of what was used, and the full license
text as required by that license.

## MuscleMap (muscle anatomy SVG path data)

**Source:** https://github.com/melihcolpan/MuscleMap
**Author:** Melih Colpan
**License:** MIT License

**What was used:** Only the raw SVG path (`d` attribute) coordinate data
describing the geometric outline of muscle-group and body-part shapes
(chest, abs, biceps, deltoids, quadriceps, trapezius/upper-back/lower-back,
triceps, gluteal, hamstring, calves, neck, forearm, hands, feet, knees,
tibialis, ankles, head, hair), converted from the original Swift source
files (`Sources/MuscleMap/Data/MaleFrontPaths.swift` and
`MaleBackPaths.swift`) into a plain JavaScript module
(`src/lib/muscleAnatomyPaths.js`). No Swift code, no rendering logic, and no
other part of the MuscleMap SDK is used — only the path geometry itself,
rendered through Masar's own original `MuscleDiagram.jsx` component with
Masar's own coloring, layout, and interaction logic.

**License text:**

```
MIT License

Copyright (c) 2026 Melih Colpan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
