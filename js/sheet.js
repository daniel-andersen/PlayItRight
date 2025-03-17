var currentSheet = {}

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
            playedNotesMatch: [],
            matchedNotesTuples: [],
            recognizedPercentage: undefined,
            correctnessPercentage: undefined,
            tooLowPercentage: undefined,
            tooHighPercentage: undefined
        },
        countdown: {
            interval: undefined,
            promise: {
                resolve: undefined,
                reject: undefined
            }
        },
        vf: undefined,
        currentMicrophone: undefined,
        wad: {
            tuner: currentSheet.wad?.tuner,
            microphone: currentSheet.wad?.microphone,
        }
    }
}

resetCurrentSheet()
