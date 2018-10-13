# Unngå UBW

Importer timeliste til UBW fra CSV.

[![](youtube.png)](https://www.youtube.com/watch?v=vziWaZY4MsQ)


## Installere

1. [Last ned uubw](https://github.com/arve0/uubw/archive/master.zip).
2. Pakk ut zip-filen.
3. Gå til chrome://extensions/.
4. Slå på utviklermodus.
5. Trykk på *Last inn upakket*.
6. Velg mappen der du pakket ut UUBW.


## Bruk

1. Lag timeliste i CSV.

    ```csv
    ;Arbeidsordre	Aktivitet	Beskrivelse	Dato	Antall timer
    32010000-1	-	Føre timer i UBW	15.10	100
    32010000-1	-	Drikke kaffe	16.10	8
    ```

2. Åpne timeføringen i UBW.
3. Dra over CSV-filen til UBW.
4. Drikk kaffe og profiiiiiiit.


## Filformat CSV

- Linjer som starter med `;` blir ignorert.
- Feltene er separert med tab.
- Arbeidsordre som ikke har aktivitet fylles ut med `-`.
- Dato har formatet `dd.mm`.


## Lisens

Copyright Arve Seljebu