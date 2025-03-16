const totalWidth = Math.min(window.innerWidth, 1200)
const totalHeight = 1000
const staveHeight = 150
const horizontalPadding = 20

var inTuneTolerance = 2.0

var currentSheet = {}

function getTimeSeconds() {
    return new Date().getTime() / 1000.0
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min
}

function resetCurrentSheet() {
    currentSheet = {
        playState: "Stopped",
        measures: [],
        notes: [],
        playback: {},
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
        currentMicrophone: undefined,
        wad: {
            tuner: currentSheet.wad?.tuner,
            microphone: currentSheet.wad?.microphone,
        }
    }
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

    updateVisualState()
}

function filterValidNotes() {
    const minDuration = 0.05
    const minVolume = 0.01

    let validNotes = []

    for (let playedNote of currentSheet.recording.notes) {
        if (playedNote.endTime - playedNote.startTime < minDuration) {
            continue
        }

        /*if (playedNote.maxVolume < minVolume) {
            continue
        }*/

        validNotes.push(playedNote)
    }

    currentSheet.recording.notes = validNotes
}

function calculateAveragePitches() {
    for (let playedNote of currentSheet.recording.notes) {
        const sortedPitches = [...playedNote.pitches].sort((a, b) => a - b)
        const midPitch = Math.floor(sortedPitches.length / 2)
    
        playedNote.averagePitch = sortedPitches.length % 2 !== 0
            ? sortedPitches[midPitch]
            : (sortedPitches[midPitch - 1] + sortedPitches[midPitch]) / 2.0

        playedNote.minPitch = Math.min(...playedNote.pitches)
        playedNote.maxPitch = Math.max(...playedNote.pitches)


        // Choose closest pitch as "average"
        const expectedPitch = Wad.pitches[playedNote.noteName]
        let closestPitchDelta = 100.0

        for (let pitch of playedNote.pitches) {
            const pitchDelta = Math.abs(pitch - expectedPitch)
            if (pitchDelta < closestPitchDelta) {
                playedNote.averagePitch = pitch
                closestPitchDelta = pitchDelta
            }
        }
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

function collapseNotes(originalNotesMatch, playedNotesMatch) {
    // C3          D3   =>   C3          D3
    // C3 F3 C3    D3   =>   C3 <- C3    D3

    // C3    C3    D3   =>   C3    C3    D3
    // C3          D3   =>   C3 -> C3    D3

    let lastPlayedNoteMatch = undefined

    for (let i = 0; i < originalNotesMatch.length; i += 1) {
        let originalNote = originalNotesMatch[i]
        let playedNote = playedNotesMatch[i]
        
        if (originalNote.noteName !== undefined) {
            if (playedNote.noteName === undefined && lastPlayedNoteMatch !== undefined && lastPlayedNoteMatch.noteName === originalNote.noteName) {
                playedNotesMatch[i] = lastPlayedNoteMatch
                playedNote = lastPlayedNoteMatch
            }
            lastPlayedNoteMatch = playedNote
            continue
        }
        
        if (lastPlayedNoteMatch === undefined || playedNote === undefined) {
            continue
        }

        if (lastPlayedNoteMatch.noteName !== playedNote.noteName)
        {
            continue
        }

        lastPlayedNoteMatch.pitches = lastPlayedNoteMatch.pitches.concat(playedNote.pitches)
        lastPlayedNoteMatch.endTime = playedNote.endTime
    }
}

function matchSheet() {
    filterValidNotes()

    const [originalNotesMatch, playedNotesMatch] = bestMatch(currentSheet.notes, currentSheet.recording.notes)

    collapseNotes(originalNotesMatch, playedNotesMatch)
    calculateAveragePitches()

    let matchedNotesTuples = []

    let s1 = []
    let s2 = []
    for (let note of originalNotesMatch) {
        s1 += (note.noteName !== undefined ? note.noteName : "--") + "   "
    }
    for (let note of playedNotesMatch) {
        s2 += (note.noteName !== undefined ? note.noteName : "--") + "   "
    }
    console.log(s1)
    console.log(s2)

    for (let i = 0; i < originalNotesMatch.length; i += 1) {
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

    matchSheet()
    drawAnalysis()
}

function startRecording(options = {}) {
    if (currentSheet.measures === undefined || currentSheet.measures.length === 0) {
        return
    }

    stopPlayOrRecord()

    currentSheet.recording.notes = []

    if (currentSheet.wad.tuner === undefined) {
        currentSheet.wad.tuner = new Wad.Poly({
            audioMeter: {
            }
        })
    }

    if (options.audioFilename === undefined) {
        if (currentSheet.wad.microphone === undefined) {
            currentSheet.wad.microphone = new Wad({source: "mic", volume: 5.0 })
        }

        currentSheet.currentMicrophone = currentSheet.wad.microphone
        currentSheet.wad.tuner.setVolume(0)

        setPlayState("Recording")
    } else {
        currentSheet.currentMicrophone = new Wad({source: options.audioFilename, volume: 2.0 })
        currentSheet.wad.tuner.setVolume(2)

        setPlayState("PlayingSheet")
    }

    currentSheet.wad.tuner.add(currentSheet.currentMicrophone)

    currentSheet.currentMicrophone.play()

    currentSheet.wad.tuner.updatePitch()

    const logPitch = function() {
        if (currentSheet.currentMicrophone === undefined) {
            return
        }

        currentSheet.recording.pitchInterval = requestAnimationFrame(logPitch)

        let noteName = currentSheet.wad.tuner.noteName
        let pitch = currentSheet.wad.tuner.pitch
        let volume = currentSheet.wad.tuner.audioMeter.volume

        if (noteName === undefined || pitch == undefined) {
            return
        }

        pitch = Math.round(pitch * 10) / 10.0

        let lastPlayedNote = currentSheet.recording.notes !== undefined && currentSheet.recording.notes.length > 0 ? currentSheet.recording.notes[currentSheet.recording.notes.length - 1] : undefined

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

function stopPlayOrRecord() {
    if (currentSheet.playback.playbackInterval !== undefined) {
        clearInterval(currentSheet.playback.playbackInterval)
        currentSheet.playback.playbackInterval = undefined

        if (currentSheet.playback.wad !== undefined) {
            currentSheet.playback.wad.stop()
            currentSheet.playback.wad = undefined
        }
    }

    if (currentSheet.recording.pitchInterval !== undefined) {
        clearInterval(currentSheet.recording.pitchInterval)
        currentSheet.recording.pitchInterval = undefined
    }

    if (currentSheet.recording.analyzeInterval !== undefined) {
        clearInterval(currentSheet.recording.analyzeInterval)
        currentSheet.recording.analyzeInterval = undefined
    }

    if (currentSheet.wad.tuner !== undefined) {
        currentSheet.wad.tuner.stopUpdatingPitch()
    }

    if (currentSheet.currentMicrophone !== undefined) {
        currentSheet.currentMicrophone.stop()
    }

    if (currentSheet.currentMicrophone !== undefined && currentSheet.wad.tuner !== undefined) {
        currentSheet.wad.tuner.remove(currentSheet.currentMicrophone)
        currentSheet.currentMicrophone = undefined
    }

    setPlayState("Stopped")
}

function runTest(measurePool) {
    generateSheet(measurePool)

    startRecording({audioFilename: "sounds/cello1.mp3" })

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
