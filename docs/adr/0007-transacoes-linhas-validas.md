# Keep valid transacoes and record each bad line

Status: accepted

A bad data line in a transacoes file used to reject the whole file. `POST /transacoes/importar` now upserts the rows that parse and records one erro per rejected line. The caller still gets 422 when this call recorded any erro, and the file still appears in `arquivos` with the counts of what landed. Recebiveis and recebimentos are unchanged.

## Considered options

- Drop the file so one bad line cannot leave a gap. We keep the valid rows, because the caller needs the rest of the file and a rerun upserts them.
- Report every problem on a line. We record the first problem only, with the messages already in use. A repeated id is reported before the other fields on that line are checked.
- Drop the earlier row when an id repeats. The first row that will be saved claims the id. A later copy is an erro. An invalid row does not claim the id. An id already stored is an upsert.
- Count a rejected line as `ignoradas`. `ignoradas` stays the non-integer `ID Transacao`, including the spreadsheet Total line.
- Apply the same rule to recebiveis and recebimentos. Recebimentos deletes linhas that are absent from the sheet, so that choice stays separate.

## Consequences

- An unreadable file, a bad header, or a failure while writing still rejects that file and records one erro. A write failure does not also record the line erros. The file is absent from `arquivos`.
- Line erros are written after that file's valid rows commit. A 422 can follow a durable partial import of a single file. The 422 body stays `{ message, arquivos, erros }` and lists only the erros this call recorded.
- A file whose every data line is rejected still appears in `arquivos`, with zeros.
- Running the same folder again appends erros. It does not replace or dedupe them.
- This supersedes the part of ADR 0002 that rolled a file back for a bad line or a repeated id.
