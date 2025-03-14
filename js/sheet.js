const totalWidth = Math.min(window.innerWidth, 1200)
const totalHeight = 1000
const staveHeight = 100
const horizontalPadding = 20
const measurementCount = 2

const inTuneTolerance = 1.5

var currentSheet = {}

function getTimeSeconds() {
    return new Date().getTime() / 1000.0
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min
}

function resetCurrentSheet() {
    currentSheet = {
        measures: [],
        notes: [],
        recording: {
            notes: [],
            pitchInterval: undefined,
            analyzeInterval: undefined,
        },
        analysis: {
            playedNotes: [],
            matchedNotesTuples: []
        },
        vf: undefined,
        microphone: undefined,
        tuner: undefined,
    }
}

function resetRenderer() {
    var container = document.getElementById("output")
    container.innerHTML = ""

    if (currentSheet.vf !== undefined) {
        currentSheet.vf.reset()
        currentSheet.vf = undefined
    }
}

function generateVisuals() {
    var x = 0
    var y = 20

    var shouldAddClef = true
    var shouldAddTimeSignature = true

    function calculateMeasureWidth(noteGroups) {
        const minWidth = 150
        const maxWidth = 250
        const noteExtraWidth = 25

        var width = minWidth

        for (var noteGroup of noteGroups)
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

        var allGraphicNotes = undefined
        
        for (var noteGroup of noteGroups)
        {
            const notes = score.notes(noteGroup.notes.join(", "), { clef: "bass" })

            for (var i = 0; i < noteGroup.notes.length; i += 1) {
                var note = noteGroup.notes[i]
                var noteName = note.substring(0, note.indexOf("/"))
                var noteGraphics = notes[i]

                currentSheet.notes.push({
                    noteName: noteName,
                    noteGraphics: noteGraphics
                })

                var color = 'black'
                var totalNoteIndex = currentSheet.notes.length - 1

                if (currentSheet.analysis !== undefined && totalNoteIndex < currentSheet.analysis.matchedNotesTuples.length) {
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

        var stave = system.addStave({voices: [score.voice(allGraphicNotes)]})

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
    var score = currentSheet.vf.EasyScore()

    currentSheet.notes = []

    for (var measure of currentSheet.measures) {
        addMeasure(measure)
    }

    currentSheet.vf.draw()

    const svgContext = document.getElementById("output").firstElementChild

    var defs = document.getElementById('defs')
    if (defs == null) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
        defs.setAttribute('id', 'defs')
        svgContext.appendChild(defs)
    }

    var arrowHead = document.getElementById('arrowHead')
    if (arrowHead == null) {
        arrowHead = document.createElementNS('http://www.w3.org/2000/svg', 'marker')
        arrowHead.setAttribute('id', 'arrowHead')
        arrowHead.setAttribute('orient', 'auto')
        arrowHead.setAttribute('markerWidth', '3')
        arrowHead.setAttribute('markerHeight', '4')
        arrowHead.setAttribute('refX', '0.1')
        arrowHead.setAttribute('refY', '2')

        var arrowHeadPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        arrowHeadPath.setAttribute('d', 'M0,0 V4 L2,2 Z')
        arrowHeadPath.setAttribute('fill', 'red')
        arrowHeadPath.setAttribute('stroke', 'none')

        arrowHead.appendChild(arrowHeadPath)
        defs.appendChild(arrowHead)
    }
}

function filterValidNotes() {
    const minDuration = 0.1
    const minVolume = 0.01

    var validNotes = []

    for (var playedNote of currentSheet.recording.notes) {
        if (playedNote.endTime - playedNote.startTime < minDuration) {
            continue
        }

        if (playedNote.maxVolume < minVolume) {
            continue
        }

        validNotes.push(playedNote)
    }

    currentSheet.recording.notes = validNotes
}

function calculateAveragePitches() {
    for (var playedNote of currentSheet.recording.notes) {
        const sortedPitches = [...playedNote.pitches].sort((a, b) => a - b)
        const midPitch = Math.floor(sortedPitches.length / 2)
    
        playedNote.averagePitch = sortedPitches.length % 2 !== 0
            ? sortedPitches[midPitch]
            : (sortedPitches[midPitch - 1] + sortedPitches[midPitch]) / 2.0

        playedNote.minPitch = Math.min(...playedNote.pitches)
        playedNote.maxPitch = Math.max(...playedNote.pitches)
    }
}

function bestMatch(s1, s2) {
    // Longest Common Subsequence (LCS) algorithm using Dynamic Programming
    const emptyNote = {
        noteName: undefined
    }

    s1 = s1.slice().reverse()
    s2 = s2.slice().reverse()

    let m = s1.length
    let n = s2.length

    // Fill DP table
    let dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (s1[i - 1].noteName === s2[j - 1].noteName) {
                dp[i][j] = dp[i - 1][j - 1] + 1
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
            }
        }
    }

    // Backtrack to find the best match
    let i = m, j = n
    let matchedS1 = [], matchedS2 = []

    while (i > 0 && j > 0) {
        if (s1[i - 1].noteName === s2[j - 1].noteName) {
            matchedS1.push(s1[i - 1])
            matchedS2.push(s2[j - 1])
            i -= 1
            j -= 1
        } else if (dp[i - 1][j] >= dp[i][j - 1]) {
            matchedS1.push(s1[i - 1])
            matchedS2.push(emptyNote)
            i -= 1
        } else {
            matchedS1.push(emptyNote)
            matchedS2.push(s2[j - 1])
            j -= 1
        }
    }

    // Add remaining notes if any
    while (i > 0) {
        matchedS1.push(s1[i - 1])
        matchedS2.push(emptyNote)
        i -= 1
    }
    while (j > 0) {
        matchedS1.push(emptyNote)
        matchedS2.push(s2[j - 1])
        j -= 1
    }

    return [matchedS1, matchedS2]
}

function matchSheet() {
    const [originalNotesMatch, playedNotesMatch] = bestMatch(currentSheet.notes, currentSheet.recording.notes)

    var matchedNotesTuples = []

    for (var i = 0; i < originalNotesMatch.length; i += 1) {
        const originalNote = originalNotesMatch[i]
        const playedNote = playedNotesMatch[i]
        
        if (originalNote.noteName !== undefined) {
            matchedNotesTuples.push([originalNote, playedNote])
        }
    }

    currentSheet.analysis.originalNotesMatch = originalNotesMatch
    currentSheet.analysis.playedNotesMatch = playedNotesMatch
    currentSheet.analysis.matchedNotesTuples = matchedNotesTuples
}

function getNoteAnalysisResult(note) {
    const originalNote = note[0]
    const playedNote = note[1]
    const played = playedNote.noteName !== undefined

    if (!played) {
        return [originalNote.noteName, played, 0.0, false, false]
    }

    const expectedPitch = Wad.pitches[originalNote.noteName]
    const pitchDelta = Math.abs(playedNote.averagePitch - expectedPitch)
    const inTune = pitchDelta <= inTuneTolerance
    const tooLow = playedNote.averagePitch < expectedPitch

    return [originalNote.noteName, played, pitchDelta, inTune, tooLow]
}

function drawAnalysis() {
    generateVisuals()

    const svgContext = document.getElementById("output").firstElementChild

    for (var i = 0; i < currentSheet.analysis.matchedNotesTuples.length; i += 1) {
        const [noteName, played, pitchDelta, inTune, tooLow] = getNoteAnalysisResult(currentSheet.analysis.matchedNotesTuples[i])
        const noteGraphics = currentSheet.notes[i].noteGraphics

        if (!played) {
            continue
        }

        console.log(noteName + " - " + (inTune ? "In tune: " : "NOT IN TUNE: ") + noteName + ", deviation: " + pitchDelta)

        if (inTune) {
            continue
        }

        const strokeWidth = 4
        const arrowLength = 3
        const arrowOffset = 5

        const boundingBox = noteGraphics.getBoundingBox()
        const x = boundingBox.x + (boundingBox.w / 2) - (strokeWidth / 2)
        const y = boundingBox.y + (tooLow ? -arrowOffset : (boundingBox.h + arrowOffset))
        const arrowDir = tooLow ? -1 : 1

        const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        arrowPath.setAttribute('stroke', 'red')
        arrowPath.setAttribute('stroke-width', '' + strokeWidth)
        arrowPath.setAttribute('marker-end', 'url(#arrowHead)')
        arrowPath.setAttribute('fill', 'none')
        arrowPath.setAttribute('d', 'M' + x + ',' + y + ', ' + x + ',' + (y + (arrowLength * (1.0 + pitchDelta) * arrowDir)))

        svgContext.appendChild(arrowPath)
    }
}

function analyzeRecording() {
    currentSheet.analysis.playedNotes = currentSheet.recording.notes.slice()

    filterValidNotes()
    calculateAveragePitches()
    matchSheet()

    drawAnalysis()
}

function startRecording(options = {}) {
    if (currentSheet.measures === undefined || currentSheet.measures.length === 0) {
        return
    }

    currentSheet.recording.notes = []

    if (options.audioFilename === undefined) {
        currentSheet.microphone = new Wad({source: 'mic' })
    } else {
        currentSheet.microphone = new Wad({source: options.audioFilename, volume: 2.0 })
    }

    currentSheet.tuner = new Wad.Poly({
        audioMeter: {
        }
    })
    currentSheet.tuner.add(currentSheet.microphone)

    currentSheet.microphone.play()

    currentSheet.tuner.updatePitch()

    const logPitch = function() {
        if (currentSheet.microphone === undefined) {
            return
        }

        currentSheet.recording.pitchInterval = requestAnimationFrame(logPitch)

        var noteName = currentSheet.tuner.noteName
        var pitch = currentSheet.tuner.pitch
        var volume = currentSheet.tuner.audioMeter.volume

        if (noteName === undefined || pitch == undefined) {
            return
        }

        pitch = Math.round(pitch * 10) / 10.0

        var lastPlayedNote = currentSheet.recording.notes !== undefined && currentSheet.recording.notes.length > 0 ? currentSheet.recording.notes[currentSheet.recording.notes.length - 1] : undefined

        if (lastPlayedNote !== undefined) {
            lastPlayedNote.endTime = getTimeSeconds()
        }

        if (currentSheet.recording.notes === undefined || lastPlayedNote == undefined || lastPlayedNote.noteName !== noteName)
        {
            console.log(pitch, noteName, Math.round(volume * 100))
            currentSheet.recording.notes.push({
                noteName: noteName,
                pitches: [],
                startTime: getTimeSeconds(),
                maxVolume: volume
            })
        }

        lastPlayedNote = currentSheet.recording.notes[currentSheet.recording.notes.length - 1]
        lastPlayedNote.pitches.push(pitch)
        lastPlayedNote.endTime = getTimeSeconds()
        lastPlayedNote.maxVolume = Math.max(lastPlayedNote.maxVolume, volume)
    }

    logPitch()

    if (document.getElementById("realtimeAnalysis").checked) {
        startRealtimeAnalysis()
    }
}

function stopRecording() {
    if (currentSheet.recording.pitchInterval !== undefined)
    {
        clearInterval(currentSheet.recording.pitchInterval)
        currentSheet.recording.pitchInterval = undefined
    }

    if (currentSheet.recording.analyzeInterval !== undefined)
        {
            clearInterval(currentSheet.recording.analyzeInterval)
            currentSheet.recording.analyzeInterval = undefined
        }

        currentSheet.tuner.stopUpdatingPitch()
    currentSheet.microphone.stop()

    currentSheet.tuner = undefined
    currentSheet.microphone = undefined
}

function runTest(measurePool) {
    generateSheet(measurePool)
    generateVisuals()

    startRecording({audioFilename: "sounds/cello2.mp3" })

    if (document.getElementById("realtimeAnalysis").checked) {
        startRealtimeAnalysis()
    }
}

function startRealtimeAnalysis() {
    currentSheet.recording.analyzeInterval = setInterval(() => {
        analyzeRecording()
    }, 500)
}

resetCurrentSheet()
