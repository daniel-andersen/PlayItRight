const totalWidth = Math.min(window.innerWidth, 1200)
const totalHeight = 1000
const staveHeight = 150
const horizontalPadding = 20

function showBoxedText(text, color) {
    const boxedTextElement = document.getElementById("boxedText")

    boxedTextElement.innerHTML = text
    boxedTextElement.style.color = color
}

function resetRenderer() {
    let container = document.getElementById("output")
    container.innerHTML = ""

    if (currentSheet.vf !== undefined) {
        currentSheet.vf.reset()
        currentSheet.vf = undefined
    }
}

function generateVisuals() {
    let x = 0
    let y = 20

    let shouldAddClef = true
    let shouldAddTimeSignature = true

    function calculateMeasureWidth(noteGroups) {
        const minWidth = 150
        const maxWidth = 250
        const noteExtraWidth = 25

        let width = minWidth

        for (let noteGroup of noteGroups)
        {
            width += noteExtraWidth * noteGroup.notes.length
        }

        return Math.min(maxWidth, Math.max(minWidth, width))
    }

    function addMeasure(noteGroups) {
        const measureWidth = calculateMeasureWidth(noteGroups)

        if (x + measureWidth + (horizontalPadding * 2) >= totalWidth) {
            x = 0
            y += staveHeight

            shouldAddClef = true
        }

        const system = currentSheet.vf.System({ x: x + horizontalPadding, y: y, width: measureWidth })

        let allGraphicNotes = undefined
        
        for (let noteGroup of noteGroups)
        {
            const notes = score.notes(noteGroup.notes.join(", "), { clef: "bass" })

            for (let i = 0; i < noteGroup.notes.length; i += 1) {
                let note = noteGroup.notes[i]
                let noteName = note.substring(0, note.indexOf("/"))
                let noteDuration = parseInt(note.substring(note.indexOf("/") + 1))
                let noteGraphics = notes[i]

                currentSheet.notes.push({
                    noteName: noteName,
                    noteDuration: noteDuration,
                    noteGraphics: noteGraphics,
                })

                let color = 'black'
                let totalNoteIndex = currentSheet.notes.length - 1

                if (currentSheet.playback.noteIndex === totalNoteIndex) {
                    color = 'blue'
                }
                else if (totalNoteIndex < currentSheet.analysis.matchedNotesTuples.length) {
                    const [nodeName, played, pitchDelta, inTune, tooLow] = getNoteAnalysisResult(currentSheet.analysis.matchedNotesTuples[totalNoteIndex])
                    color = !played ? 'black' : (inTune ? 'green' : 'red')
                }

                noteGraphics.setStyle({fillStyle: color, strokeStyle: color})
            }

            const toAdd = noteGroup.notes.length > 1 ?
                score.beam(notes) :
                notes

            if (allGraphicNotes !== undefined) {
                allGraphicNotes = allGraphicNotes.concat(toAdd)
            } else {
                allGraphicNotes = toAdd
            }
        }

        let stave = system.addStave({voices: [score.voice(allGraphicNotes)]})

        if (shouldAddClef) {
            stave.addClef('bass')
        }
        shouldAddClef = false

        if (shouldAddTimeSignature) {
            stave.addTimeSignature('4/4')
        }
        shouldAddTimeSignature = false

        x += measureWidth
    }

    resetRenderer()

    currentSheet.vf = new Vex.Flow.Factory({renderer: {elementId: 'output', width: totalWidth, height: totalHeight}})
    let score = currentSheet.vf.EasyScore()

    currentSheet.notes = []

    for (let measure of currentSheet.measures) {
        addMeasure(measure)
    }

    currentSheet.vf.draw()

    const svgContext = document.getElementById("output").firstElementChild

    let defs = document.getElementById('defs')
    if (defs == null) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
        defs.setAttribute('id', 'defs')
        svgContext.appendChild(defs)
    }

    let arrowHead = document.getElementById('arrowHead')
    if (arrowHead == null) {
        arrowHead = document.createElementNS('http://www.w3.org/2000/svg', 'marker')
        arrowHead.setAttribute('id', 'arrowHead')
        arrowHead.setAttribute('orient', 'auto')
        arrowHead.setAttribute('markerWidth', '3')
        arrowHead.setAttribute('markerHeight', '4')
        arrowHead.setAttribute('refX', '0.1')
        arrowHead.setAttribute('refY', '2')

        let arrowHeadPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        arrowHeadPath.setAttribute('d', 'M0,0 V4 L2,2 Z')
        arrowHeadPath.setAttribute('fill', 'red')
        arrowHeadPath.setAttribute('stroke', 'none')

        arrowHead.appendChild(arrowHeadPath)
        defs.appendChild(arrowHead)
    }

    showBoxedText("", "black")

    updateVisualState()
}

function drawAnalysis() {
    generateVisuals()

    const svgContext = document.getElementById("output").firstElementChild

    for (let i = 0; i < currentSheet.analysis.matchedNotesTuples.length; i += 1) {
        const [noteName, played, pitchDelta, inTune, tooLow] = getNoteAnalysisResult(currentSheet.analysis.matchedNotesTuples[i])
        const noteGraphics = currentSheet.notes[i].noteGraphics

        if (!played) {
            console.log(noteName + " - Not played")
            continue
        }

        console.log(noteName + " - " + (inTune ? "In tune" : (tooLow ? "TOO LOW" : "TOO HIGH")) + ": " + noteName + ", deviation: " + pitchDelta)

        if (inTune) {
            continue
        }

        const strokeWidth = 4
        const arrowLength = 3
        const arrowOffset = 5

        const boundingBox = noteGraphics.getBoundingBox()
        const x = boundingBox.x + (boundingBox.w / 2) - (strokeWidth / 2)
        const y = boundingBox.y + (tooLow ? (boundingBox.h + arrowOffset) : -arrowOffset)
        const arrowDir = tooLow ? 1 : -1

        const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        arrowPath.setAttribute('stroke', 'red')
        arrowPath.setAttribute('stroke-width', '' + strokeWidth)
        arrowPath.setAttribute('marker-end', 'url(#arrowHead)')
        arrowPath.setAttribute('fill', 'none')
        arrowPath.setAttribute('d', 'M' + x + ',' + y + ', ' + x + ',' + (y + (arrowLength * (1.0 + pitchDelta) * arrowDir)))

        svgContext.appendChild(arrowPath)
    }

    if (currentSheet.analysis.correctnessPercentage !== undefined) {
        if (currentSheet.analysis.recognizedPercentage >= validRecognizedPercentage) {
            if (currentSheet.analysis.correctnessPercentage >= acceptedCorrectnessPercentage) {
                showBoxedText("✓", "green")
            }
            else if (currentSheet.analysis.tooLowPercentage > currentSheet.analysis.tooHighPercentage) {
                showBoxedText("↓", "red")
            }
            else {
                showBoxedText("↑", "red")
            }
        }
        else {
            showBoxedText("?", "black")
        }
    }
}