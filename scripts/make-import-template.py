"""Builds app/assets/avelune-import-template.xlsx: the spreadsheet users can download, fill in and import.

Run: python3 scripts/make-import-template.py   (needs openpyxl)
The first sheet ("Your data") is what Avelune imports; "Example" and "How to fill" are ignored.
"""
import datetime as dt
import pathlib
import re

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = pathlib.Path(__file__).resolve().parent.parent
CATALOG = (ROOT / 'app/src/catalog.ts').read_text()


def labels(cat_id):
    block = re.search(r"id: '%s'.*?options: \[(.*?)\n    \]," % cat_id, CATALOG, re.S).group(1)
    return re.findall(r"label: (?:'|\")(.*?)(?:'|\")", block)


PLUM, BLUSH, INK, MUTED = '7B3454', 'F6DCE1', '3A2731', '7A6870'
COLS = [
    ('Date', 14, 'Required. Use the date format of your spreadsheet, e.g. 2026-10-31.'),
    ('Flow', 11, 'None, Spotting, Light, Medium or Heavy. Leave empty if not on your period.'),
    ('Symptoms', 30, 'Separate several with commas, e.g. Cramps, Headache.'),
    ('Mood', 22, 'Separate several with commas, e.g. Calm, Happy.'),
    ('Other', 24, 'Activities and other tags, e.g. Yoga, Stress, Took pill.'),
    ('BBT (°C)', 11, 'Basal body temperature. °F values are detected automatically.'),
    ('Weight (kg)', 12, 'Body weight. Pounds can be chosen when importing.'),
    ('Water (ml)', 11, 'Water you drank that day, in millilitres.'),
    ('Sleep (hours)', 13, 'Hours slept, e.g. 7.5.'),
    ('Distance (km)', 13, 'Distance walked or run.'),
    ('Steps', 10, 'Step count.'),
    ('Resting HR', 11, 'Resting heart rate in bpm.'),
    ('Notes', 36, 'Anything else.'),
]
EXAMPLE = [
    (dt.date(2026, 10, 1), 'Medium', 'Cramps, Fatigue', 'Calm', 'Yoga', 36.4, 61.2, 1750, 7.5, 3.2, 6400, 62, 'First day'),
    (dt.date(2026, 10, 2), 'Heavy', 'Cramps, Headache, Bloating', 'Irritated', '', 36.3, '', 2000, 8, '', 5200, 64, ''),
    (dt.date(2026, 10, 3), 'Light', 'Backache', 'Happy, Energetic', 'Walking', 36.4, '', 2250, 7, 4.1, 9100, 61, ''),
    (dt.date(2026, 10, 14), '', 'Tender breasts', 'Energetic', 'Running, Ovulation test: positive', 36.8, 61.0, 2500, 7.5, 6.0, 12000, 60, 'Felt great'),
    (dt.date(2026, 10, 20), '', 'Acne, Cravings', 'Mood swings', 'Stress', 36.9, '', 1500, 6, '', 4300, 65, ''),
]

thin = Side(style='thin', color='EEE2DD')
head_font = Font(name='Calibri', bold=True, color='FFFFFF', size=11)
head_fill = PatternFill('solid', fgColor=PLUM)
band_fill = PatternFill('solid', fgColor='FBF6F3')


def header(ws):
    for i, (name, width, _) in enumerate(COLS, start=1):
        c = ws.cell(row=1, column=i, value=name)
        c.font, c.fill = head_font, head_fill
        c.alignment = Alignment(horizontal='center', vertical='center')
        ws.column_dimensions[c.column_letter].width = width
    ws.row_dimensions[1].height = 24
    ws.freeze_panes = 'B2'


def body_format(ws, rows):
    for r in range(2, rows + 2):
        ws.cell(row=r, column=1).number_format = 'yyyy-mm-dd'
        for col in range(1, len(COLS) + 1):
            cell = ws.cell(row=r, column=col)
            cell.border = Border(bottom=thin)
            if r % 2 == 0:
                cell.fill = band_fill
            if col in (3, 4, 5, 13):
                cell.alignment = Alignment(wrap_text=True, vertical='top')


wb = Workbook()
ws = wb.active
ws.title = 'Your data'
header(ws)
body_format(ws, 400)
flow = DataValidation(type='list', formula1='"None,Spotting,Light,Medium,Heavy"', allow_blank=True)
flow.error, flow.errorTitle, flow.prompt, flow.promptTitle = 'Choose a flow from the list.', 'Flow', COLS[1][2], 'Flow'
ws.add_data_validation(flow)
flow.add('B2:B401')
date_v = DataValidation(type='date', operator='greaterThan', formula1='DATE(2000,1,1)', allow_blank=True)
date_v.error, date_v.errorTitle = 'Enter a date, e.g. 2026-10-31.', 'Date'
ws.add_data_validation(date_v)
date_v.add('A2:A401')
for i, (_, _, tip) in enumerate(COLS, start=1):
    if i > 2:
        dv = DataValidation(allow_blank=True)
        dv.prompt, dv.promptTitle = tip, COLS[i - 1][0]
        ws.add_data_validation(dv)
        dv.add(f'{ws.cell(row=2, column=i).column_letter}2:{ws.cell(row=2, column=i).column_letter}401')

ex = wb.create_sheet('Example')
header(ex)
for r, row in enumerate(EXAMPLE, start=2):
    for c, v in enumerate(row, start=1):
        ex.cell(row=r, column=c, value=v if v != '' else None)
body_format(ex, len(EXAMPLE))

how = wb.create_sheet('How to fill')
how.column_dimensions['A'].width = 18
how.column_dimensions['B'].width = 90
how['A1'] = 'Avelune import template'
how['A1'].font = Font(size=16, bold=True, color=PLUM)
steps = [
    'Fill in the "Your data" sheet: one row per day. Only the Date column is required; leave anything else empty.',
    'See the "Example" sheet for how a filled-in sheet looks. It is never imported.',
    'Save the file (keep it as .xlsx, or export as .csv), then in Avelune open Settings → Your data → Import from file.',
    'Avelune shows a preview before anything is saved, and you can choose whether imported values replace what you already logged.',
]
for i, s in enumerate(steps, start=3):
    how.cell(row=i, column=1, value=f'Step {i - 2}').font = Font(bold=True, color=INK)
    how.cell(row=i, column=2, value=s).alignment = Alignment(wrap_text=True)
r = len(steps) + 4
how.cell(row=r, column=1, value='Columns').font = Font(size=13, bold=True, color=PLUM)
for name, _, tip in COLS:
    r += 1
    how.cell(row=r, column=1, value=name).font = Font(bold=True, color=INK)
    how.cell(row=r, column=2, value=tip).alignment = Alignment(wrap_text=True)
r += 2
how.cell(row=r, column=1, value='Words Avelune knows').font = Font(size=13, bold=True, color=PLUM)
for title, ids in [('Symptoms', ['symptoms']), ('Mood', ['mood']), ('Other', ['activity', 'other', 'pill', 'tests', 'discharge', 'sex'])]:
    r += 1
    words = sorted({w for i in ids for w in labels(i)})
    how.cell(row=r, column=1, value=title).font = Font(bold=True, color=INK)
    c = how.cell(row=r, column=2, value=', '.join(words))
    c.alignment = Alignment(wrap_text=True, vertical='top')
r += 2
how.cell(row=r, column=2, value='Your file stays on your device. Avelune never uploads it anywhere.').font = Font(italic=True, color=MUTED)

out = ROOT / 'app/assets/avelune-import-template.xlsx'
wb.save(out)
print('wrote', out, out.stat().st_size, 'bytes')
