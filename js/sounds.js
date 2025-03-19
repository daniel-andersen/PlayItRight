let playbackTempo = 60
let noteSounds = {}

const noteSoundFiles = {
    cello: {
        "A2": "sounds/cello/357911__mtg__cello-a2.wav",
        "A#2": "sounds/cello/357912__mtg__cello-a2.wav",
        "A3": "sounds/cello/357923__mtg__cello-a3.wav",
        "A#3": "sounds/cello/357924__mtg__cello-a3.wav",
        "B2": "sounds/cello/357913__mtg__cello-b2.wav",
        "B3": "sounds/cello/357925__mtg__cello-b3.wav",
        "C2": "sounds/cello/357902__mtg__cello-c2.wav",
        "C#2": "sounds/cello/357903__mtg__cello-c2.wav",
        "C3": "sounds/cello/357914__mtg__cello-c3.wav",
        "C#3": "sounds/cello/357915__mtg__cello-c3.wav",
        "C4": "sounds/cello/357926__mtg__cello-c4.wav",
        "C#4": "sounds/cello/357927__mtg__cello-c4.wav",
        "D2": "sounds/cello/357904__mtg__cello-d2.wav",
        "D#2": "sounds/cello/357905__mtg__cello-d2.wav",
        "D3": "sounds/cello/357916__mtg__cello-d3.wav",
        "D#3": "sounds/cello/357917__mtg__cello-d3.wav",
        "D4": "sounds/cello/357928__mtg__cello-d4.wav",
        "D#4": "sounds/cello/357929__mtg__cello-d4.wav",
        "E2": "sounds/cello/357906__mtg__cello-e2.wav",
        "E3": "sounds/cello/357918__mtg__cello-e3.wav",
        "E4": "sounds/cello/357930__mtg__cello-e4.wav",
        "F2": "sounds/cello/357907__mtg__cello-f2.wav",
        "F#2": "sounds/cello/357908__mtg__cello-f2.wav",
        "F3": "sounds/cello/357919__mtg__cello-f3.wav",
        "F#3": "sounds/cello/357920__mtg__cello-f3.wav",
        "F4": "sounds/cello/357931__mtg__cello-f4.wav",
        "F#4": "sounds/cello/357932__mtg__cello-f4.wav",
        "G2": "sounds/cello/357909__mtg__cello-g2.wav",
        "G#2": "sounds/cello/357910__mtg__cello-g2.wav",
        "G3": "sounds/cello/357921__mtg__cello-g3.wav",
        "G#3": "sounds/cello/357922__mtg__cello-g3.wav",
        "G4": "sounds/cello/357933__mtg__cello-g4.wav",
        "G#4": "sounds/cello/357934__mtg__cello-g4.wav",
    }
}

function fetchSounds(instrument) {
    const sounds = noteSoundFiles[instrument]

    for (const [note, filename] of Object.entries(sounds)) {
        noteSounds[note] = new Wad({source: filename, volume: 2.0 })
    }
}

function playCurrentSheet() {
    setPlayState("PlayingSheet")

    currentSheet.playback.noteIndex = 0
    currentSheet.playback.wad = undefined

    function playNextNote() {
        if (currentSheet.playback.noteIndex >= currentSheet.notes.length) {
            stopPlayOrRecord()
            generateVisuals()
            return
        }

        if (currentSheet.playback.wad !== undefined) {
            currentSheet.playback.wad.stop()
            currentSheet.playback.wad = undefined
        }

        const note = currentSheet.notes[currentSheet.playback.noteIndex]

        currentSheet.playback.wad = noteSounds[note.noteName]
        currentSheet.playback.wad.play()

        generateVisuals()

        showBoxedText(getDisplayNoteName(note.noteName), "green")
        showNoteName(note)
            
        currentSheet.playback.noteIndex += 1

        currentSheet.playback.playbackInterval = setTimeout(() => {
            playNextNote()
        }, playbackTempo * (3 - Math.log2(note.noteDuration)) * 1000 / 60)
    }

    currentSheet.playback.playbackInterval = setTimeout(() => {
        playNextNote()
    }, 0)
}
