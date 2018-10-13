async function test () {
    let timesheet = [
        ['32010000-1', '-', 'Føre timer i UBW', '15.10', '100'],
        ['32010025-1', '14', 'VEGLOGG-6432 Filvedlegg i sak', '16.10', '8'],
        ['32010025-1', '15', 'VEGLOGG-6438 Søkekriterier', '17.10', '8'],
        ['32610015-2', '-', 'Rådgivning', '18.10', '8'],
        ['32610015-3', '-', 'JS Fundementals', '19.10', '8'],
    ]

    for (const entry of timesheet) {
        await fillTimesheet(entry)
        console.log('done...')
    }
}
