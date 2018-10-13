const DELIMITER = '\t'

// cancel dragover to allow dropping over other elements
document.addEventListener('dragover', e => e.preventDefault())

document.addEventListener('drop', async event => {
    if (!timesheetIsActive()) {
        return
    }
    event.preventDefault()

    const csv = toArray(event.dataTransfer.items).find(i => i.type === 'text/csv')
    if (!csv) {
        return console.log('Fant ingen CSV fil.')
    }

    const contents = await readFile(csv.getAsFile())
    const timesheetEntries = contents.split('\n')
        .filter(line => line[0] !== ';')
        .map(line => line.split(DELIMITER))

    for (const entry of timesheetEntries) {
        await fillTimesheet(entry)
    }
})

function timesheetIsActive () {
    const tab = $('.x-tab.selected')
    return tab && tab.innerText.indexOf('Timeliste ') === 0
}

function readFile (file) {
    return new Promise((resolve) => {
        const filereader = new FileReader()
        filereader.readAsText(file)
        filereader.onload = () => resolve(filereader.result)
    })
}

function getDays () {
    const DAYS = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn']
    return $$('[data-u4xtype="u4_numbercolumn"]')
        .map(el => el.outerText.trim())
        .filter(el => DAYS.some(day => el.includes(day)))
}

async function fillTimesheet([ workorder, activity, description, date, amount ]) {
    console.log([ workorder, activity, description, date, amount ].join(', '))

    click('a[data-qtip="Legg til arb.oppgave"]')
    await untilLoadingDone(1000)

    const codeInput = await waitFor('input[placeholder="Søk i prosjekt eller arbeidsordre"]')
    codeInput.value = workorder
    codeInput.dispatchEvent(new Event('keyup'))
    await untilLoadingDone()

    const codeElement = await waitFor(`[data-qtip="${workorder}"]`)
    codeElement.click()
    await untilLoadingDone()

    if (activity !== '-') {
        const activityElement = await waitFor(`[data-recordid="${activity}"]`)
        activityElement.click()
    }

    const addCodeElement = await waitFor('[data-u4id="addToTimesheetBtn"]')
    addCodeElement.click()
    await untilLoadingDone()

    const tableView = await waitFor('div[data-u4id="abw-pcb-timesheet-grid-view"]')
    const inputRow = await waitFor('table[data-u4id="descriptionEditor"] input', tableView)
    inputRow.value = description

    const dayColumn = getDays().findIndex(day => day.includes(date))
    const amountInput = $(`input[name="regValue${dayColumn + 1}"]`) // regValue1 is first
    amountInput.value = amount
}

function $ (selector, element = document) {
    return element.querySelector(selector)
}
function $$ (selector, element = document) {
    return Array.from(element.querySelectorAll(selector))
}
function toArray (arrayLike) {
    return arrayLike ? Array.from(arrayLike) : []
}
function click (element) {
    if (typeof element === 'string') {
        $(element).dispatchEvent(new Event('click'))
    } else {
        element.dispatchEvent(new Event('click'))
    }
}
function waitFor (selector, parent) {
    return new Promise(resolve => {
        const interval = setInterval(() => {
            const element = $(selector, parent)
            if (element !== null) {
                clearInterval(interval)
                resolve(element)
            }
        }, 100)
    })
}
function untilLoadingDone (timeout = 2000) {
    let hasBeenLoading = isLoading()
    let done = false

    return new Promise(resolve => {
        let interval = setInterval(async () => {
            // safe to waitFor, as element is not removed after loading is done
            let loading = isLoading()

            if (!hasBeenLoading && loading) {
                hasBeenLoading = true;
            } else if (hasBeenLoading && !loading) {
                done = true
                clearInterval(interval)
                setTimeout(resolve, 300)  // let things calm down
            }
        }, 10)

        // make sure we eventually resolve
        setTimeout(() => {
            if (done) { return }  // avoid race
            clearInterval(interval)
            resolve()
        }, timeout)
    })
}
function isLoading () {
    return $$('.x-mask-msg-text')
        .filter(e => e.outerText.trim() === 'Laster...')
        .some(isVisible)
}
function isVisible (element) {
    var rect = element.getBoundingClientRect()

    return (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right <= window.innerWidth
    )
}