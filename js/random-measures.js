const measurePools = [
    {
        name: "Easy",
        type: "random",
        creationStrategy: "random",
        measures: [
            [ { notes: ["D3/1"] } ],
            [ { notes: ["A2/1"] } ],
            [ { notes: ["G2/1"] } ],
            [ { notes: ["G2/2"] }, { notes: ["C3/2"] } ],
            [ { notes: ["B2/2"] }, { notes: ["F2/2"] } ],
            [ { notes: ["A3/2"] }, { notes: ["D4/2"] } ],
            [ { notes: ["D3/2"] }, { notes: ["A3/2"] } ],
            [ { notes: ["G2/2"] }, { notes: ["C3/2"] } ],
            [ { notes: ["D3/4"] }, { notes: ["F3/4"] }, { notes: ["E3/2"] } ],
            [ { notes: ["B3/2"] }, { notes: ["G3/4"] }, { notes: ["A3/4"] } ],
            [ { notes: ["C3/4"] }, { notes: ["B2/4"] }, { notes: ["C3/2"] } ],
            [ { notes: ["D4/2"] }, { notes: ["B3/4"] }, { notes: ["A3/4"] } ],
            [ { notes: ["B3/4"] }, { notes: ["C4/2"] }, { notes: ["A3/4"] } ],
            [ { notes: ["B3/4"] }, { notes: ["C4/2"] }, { notes: ["D4/4"] } ],
            [ { notes: ["D3/2"] }, { notes: ["F3/4"] }, { notes: ["E3/4"] } ],
            [ { notes: ["B2/2"] }, { notes: ["A2/4"] }, { notes: ["B2/4"] } ],
            [ { notes: ["G3/2"] }, { notes: ["A3/4"] }, { notes: ["F3/4"] } ],
            [ { notes: ["D3/4"] }, { notes: ["E3/4"] }, { notes: ["C3/2"] } ],
            [ { notes: ["A3/4"] }, { notes: ["G3/4"] }, { notes: ["F3/4"] }, { notes: ["E3/4"] } ],
            [ { notes: ["F3/4"] }, { notes: ["E3/4"] }, { notes: ["F3/4"] }, { notes: ["A3/4"] } ],
            [ { notes: ["D3/4"] }, { notes: ["B2/4"] }, { notes: ["C3/4"] }, { notes: ["A2/4"] } ],
            [ { notes: ["C2/4"] }, { notes: ["E2/4"] }, { notes: ["G2/4"] }, { notes: ["B2/4"] } ],
            [ { notes: ["F2/4"] }, { notes: ["E2/4"] }, { notes: ["D2/4"] }, { notes: ["C2/4"] } ],
            [ { notes: ["C2/4"] }, { notes: ["E2/4"] }, { notes: ["D2/4"] }, { notes: ["F2/4"] } ],
            [ { notes: ["D3/4"] }, { notes: ["D3/4"] }, { notes: ["G2/4"] }, { notes: ["G2/4"] } ],
            [ { notes: ["A3/4"] }, { notes: ["F3/4"] }, { notes: ["G3/4"] }, { notes: ["E3/4"] } ],
            [ { notes: ["D4/4"] }, { notes: ["C4/4"] }, { notes: ["D4/4"] }, { notes: ["B3/4"] } ],
            [ { notes: ["D3/4"] }, { notes: ["C3/4"] }, { notes: ["E3/4"] }, { notes: ["F3/4"] } ],
            [ { notes: ["E3/4"] }, { notes: ["F3/4"] }, { notes: ["G3/4"] }, { notes: ["A3/4"] } ],
            [ { notes: ["E2/4"] }, { notes: ["E2/4"] }, { notes: ["F2/4"] }, { notes: ["G2/4"] } ],
        ],
    },
    {
        name: "Simple",
        type: "warmup",
        creationStrategy: "sequence",
        measures: [
            [{ notes: ["A3/2"] }, { notes: ["D4/2"] }],
            [{ notes: ["D3/1"] }],
            [{ notes: ["D3/2"] }, { notes: ["A3/2"] }],
            [{ notes: ["A2/1"] }],
            [{ notes: ["G2/2"] }, { notes: ["C3/2"] }],
            [{ notes: ["G2/1"] }],
        ]
    }
]

var dropdownToMeasure = {}

function populateSheetDropdown() {
    dropdownToMeasure = {}

    var dropdown = document.getElementById("sheets")
    dropdown.innerHTML = ""

    addDropdownElement(dropdown, {name: "--- Random Sheets ---"})
    for (let measure of measurePools) {
        if (measure.type === "random") {
            addDropdownElement(dropdown, measure)
        }
    }

    addDropdownElement(dropdown, {name: "--- Warmup ---"})
    for (let measure of measurePools) {
        if (measure.type === "warmup") {
            addDropdownElement(dropdown, measure)
        }
    }

    dropdown.value = 1
}

function addDropdownElement(dropdown, measure) {
    let option = document.createElement("option")
    option.value = dropdown.options.length
    option.innerHTML = measure.name

    dropdownToMeasure[option.value] = measure

    dropdown.appendChild(option)
}

function generateSheet(measurePool) {
    const measureCount = document.getElementById("measureCount").value
    
    resetCurrentSheet()

    if (measurePool.creationStrategy === "random") {
        generateRandomSheet(measurePool, measureCount)
    }
    else if (measurePool.creationStrategy === "sequence") {
        generateSequenceSheet(measurePool)
    }

    generateVisuals()
}

function generateRandomSheet(measurePool, measureCount) {
    currentSheet.measures = []

    let remainingPool = measurePool.measures.slice()

    let lastNote = undefined

    for (let i = 0; i < measureCount; i++) {
        let newLastNote = undefined
        let measure = undefined
        let randomIndex = undefined

        if (remainingPool.length == 0) {
            break
        }

        do {
            randomIndex = getRandomInt(0, remainingPool.length)
            measure = remainingPool[randomIndex].slice()

            newLastNote = measure[measure.length - 1].notes[measure[measure.length - 1].notes.length - 1]
        } while (newLastNote === lastNote)

        lastNote = newLastNote
        
        currentSheet.measures.push(measure)

        remainingPool.splice(randomIndex, 1)
    }
}

function generateSequenceSheet(measurePool) {
    currentSheet.measures = []

    for (let i = 0; i < measurePool.measures.length; i++) {
        let measure = measurePool.measures[i].slice()

        currentSheet.measures.push(measure)
    }
}
