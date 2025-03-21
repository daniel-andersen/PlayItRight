var inTuneTolerance = 2.0

const perfectTolerance = 1.0
const validRecognizedPercentage = 0.5
const acceptedCorrectnessPercentage = 0.8
const tendencyNoiseThreshold = 0.7

const firstPositionFirstFingerNotes = ["D2", "A2", "E3", "B3"]
const firstPositionSecondFingerNotes = ["D#2", "A#2", "F3", "C4"]
const firstPositionThirdFingerNotes = ["E2", "B2", "F#3", "C#4"]
const firstPositionFourthFingerNotes = ["F2", "C3", "G3", "D4"]

function resetAnalysis() {
    currentSheet.recording.notes = []
    currentSheet.analysis.playedNotes = []
    currentSheet.analysis.playedNotesMatch = []
    currentSheet.analysis.matchedNotesTuples = []
    currentSheet.analysis.summaryText = undefined
    currentSheet.analysis.recognizedPercentage = undefined
    currentSheet.analysis.correctnessPercentage = undefined
    currentSheet.analysis.tooLowPercentage = undefined
    currentSheet.analysis.tooHighPercentage = undefined
}

function analyzeRecording() {
    currentSheet.analysis.playedNotes = currentSheet.recording.notes.slice()

    matchSheet()
    analyzeGeneralTendency()

    drawAnalysis()
}

function analyzeGeneralTendency() {
    let tooLowCount = 0
    let tooHighCount = 0
    let perfectCount = 0
    let totalCount = 0
    let totalPlayedCount = 0

    for (let matchedNoteTuple of currentSheet.analysis.matchedNotesTuples) {
        totalCount += 1

        const [noteName, played, pitchDelta, inTune, tooLow] = getNoteAnalysisResult(matchedNoteTuple)
        if (!played) {
            continue
        }

        totalPlayedCount += 1

        if (pitchDelta <= perfectTolerance) {
            perfectCount += 1
            continue
        }

        tooLowCount += tooLow ? 1 : 0
        tooHighCount += tooLow ? 0 : 1
    }

    currentSheet.analysis.summaryText = ""

    const analysisResult = analyzeSpecificNotes("General analysis", undefined, true)
    currentSheet.analysis.recognizedPercentage = analysisResult.recognizedPercentage
    currentSheet.analysis.correctnessPercentage = analysisResult.correctnessPercentage
    currentSheet.analysis.tooLowPercentage = analysisResult.tooLowPercentage
    currentSheet.analysis.tooHighPercentage = analysisResult.tooHighPercentage

    addSummaryText(analysisResult)

    // First position
    addSummaryText(analyzeSpecificNotes("1st finger", firstPositionFirstFingerNotes, false))
    addSummaryText(analyzeSpecificNotes("2nd finger", firstPositionSecondFingerNotes, false))
    addSummaryText(analyzeSpecificNotes("3rd finger", firstPositionThirdFingerNotes, false))
    addSummaryText(analyzeSpecificNotes("4th finger", firstPositionFourthFingerNotes, false))
}

function analyzeSpecificNotes(text, notes, forceResultText) {
    let tooLowCount = 0
    let tooHighCount = 0
    let perfectCount = 0
    let totalCount = 0
    let totalPlayedCount = 0

    for (let matchedNoteTuple of currentSheet.analysis.matchedNotesTuples) {
        const [noteName, played, pitchDelta, inTune, tooLow] = getNoteAnalysisResult(matchedNoteTuple)

        if (notes !== undefined && !notes.includes(noteName)) {
            continue
        }

        totalCount += 1

        if (!played) {
            continue
        }

        totalPlayedCount += 1

        if (pitchDelta <= perfectTolerance) {
            perfectCount += 1
            continue
        }

        tooLowCount += tooLow ? 1 : 0
        tooHighCount += tooLow ? 0 : 1
    }

    let resultText = ""
    let showResultText = false

    const recognizedPercentage = totalPlayedCount > 0 ? totalPlayedCount / totalCount : 0.0
    const correctnessPercentage = totalPlayedCount > 0 ? perfectCount / totalPlayedCount : 0.0
    const tooLowPercentage = totalPlayedCount > 0 ? tooLowCount / totalPlayedCount : 0.0
    const tooHighPercentage = totalPlayedCount > 0 ? tooHighCount / totalPlayedCount : 0.0

    if (recognizedPercentage >= validRecognizedPercentage) {
        if (correctnessPercentage >= acceptedCorrectnessPercentage) {
            resultText = "Good"
        }
        else if (Math.min(tooLowPercentage, tooHighPercentage) / Math.max(tooLowPercentage, tooHighPercentage) >= tendencyNoiseThreshold) {
            resultText = "Both too low and too high"
            showResultText = true
        }
        else if (tooLowPercentage > tooHighPercentage) {
            resultText = "Too low"
            showResultText = true
        }
        else {
            resultText = "Too high"
            showResultText = true
        }
    }
    else {
        resultText = "Too few tones played"
    }

    return {
        summaryText: showResultText || forceResultText ? "<strong>" + text + ": </strong>" + resultText + "." : undefined,
        recognizedPercentage: totalPlayedCount > 0 ? totalPlayedCount / totalCount : 0.0,
        correctnessPercentage: totalPlayedCount > 0 ? perfectCount / totalPlayedCount : 0.0,
        tooLowPercentage: totalPlayedCount > 0 ? tooLowCount / totalPlayedCount : 0.0,
        tooHighPercentage: totalPlayedCount > 0 ? tooHighCount / totalPlayedCount : 0.0
    }
}

function addSummaryText(result) {
    if (result.summaryText !== undefined) {
        currentSheet.analysis.summaryText += " " + result.summaryText
    }
}

function startRealtimeAnalysis() {
    const realtimeAnalysisElement = document.getElementById("realtimeAnalysis")
    
    currentSheet.recording.analyzeInterval = setInterval(() => {
        if (realtimeAnalysisElement.checked) {
            analyzeRecording()
        }
    }, 500)
}

function filterValidNotes() {
    const minDuration = 0.05
    const minVolume = 0.01

    let validNotes = []

    for (let playedNote of currentSheet.recording.notes) {
        /*if (playedNote.endTime - playedNote.startTime < minDuration) {
            continue
        }*/

        /*if (playedNote.maxVolume < minVolume) {
            continue
        }*/

        validNotes.push(playedNote)
    }

    currentSheet.recording.notes = validNotes
}

function calculateAveragePitches() {
    for (let playedNote of currentSheet.recording.notes) {
        /*const sortedPitches = [...playedNote.pitches].sort((a, b) => a - b)
        const midPitch = Math.floor(sortedPitches.length / 2)
    
        playedNote.averagePitch = sortedPitches.length % 2 !== 0
            ? sortedPitches[midPitch]
            : (sortedPitches[midPitch - 1] + sortedPitches[midPitch]) / 2.0*/

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
