#!/usr/bin/env python3
"""Buduje skrót iPhone'a „Plan 12 zegarek" (niepodpisany plik .shortcut).

Skrót dostaje od planu datę i godzinę startu treningu (tekst, np.
„2026-09-25 17:03"), czyta z aplikacji Zdrowie tętno i energię aktywną
zapisane od tej chwili, liczy średnią, maksimum i sumę i otwiera plan
z liczbami w adresie: ?zegarek=1&avg=…&max=…&kcal=…

Podpis (bez niego iOS nie przyjmie pliku) robi macOS:
    shortcuts sign --mode anyone --input <niepodpisany> --output <podpisany>
— w repozytorium robi to workflow .github/workflows/skrot.yml.

    python3 tools/skrot-zegarek.py skrot/niepodpisany.shortcut
"""
import plistlib
import sys
import uuid

ADRES = 'https://olgaerobert-code.github.io/trening/'
OBJ = '￼'  # znak-zastępca, w którego miejscu Skróty wstawiają zmienną


def zmienna(nazwa):
    return {'Value': {'Type': 'Variable', 'VariableName': nazwa},
            'WFSerializationType': 'WFTextTokenAttachment'}


def wejscie_skrotu():
    return {'Value': {'Type': 'ExtensionInput'}, 'WFSerializationType': 'WFTextTokenAttachment'}


def tekst_ze_zmiennymi(czesci):
    """czesci: lista napisów i nazw zmiennych w postaci ('var', nazwa)."""
    napis, zal = '', {}
    for c in czesci:
        if isinstance(c, tuple):
            # Klucz to zakres w jednostkach UTF-16 — tu wszystko jest w BMP.
            zal['{%d, 1}' % len(napis)] = {'Type': 'Variable', 'VariableName': c[1]}
            napis += OBJ
        else:
            napis += c
    return {'Value': {'string': napis, 'attachmentsByRange': zal},
            'WFSerializationType': 'WFTextTokenString'}


def akcja(ident, **param):
    param.setdefault('UUID', str(uuid.uuid4()).upper())
    return {'WFWorkflowActionIdentifier': ident, 'WFWorkflowActionParameters': param}


def probki(typ):
    """„Find Health Samples": Type = typ, Start Date is after [Start]."""
    return akcja(
        'is.workflow.actions.filter.health.quantity',
        WFContentItemFilter={
            'Value': {
                'WFActionParameterFilterPrefix': 1,          # wszystkie warunki naraz
                'WFContentPredicateBoundedDate': False,
                'WFActionParameterFilterTemplates': [
                    {'Operator': 4, 'Property': 'Type', 'Removable': False,
                     'Values': {'Enumeration': typ}},
                    {'Operator': 2, 'Property': 'Start Date', 'Removable': True,
                     'Values': {'Date': zmienna('Start'), 'Unit': 4}},
                ],
            },
            'WFSerializationType': 'WFContentPredicateTableTemplate',
        },
        WFContentItemLimitEnabled=False,
    )


def statystyka(op, do_zmiennej):
    return [
        akcja('is.workflow.actions.statistics', WFStatisticsOperation=op),
        akcja('is.workflow.actions.round', WFRoundMode='Normal', WFRoundTo='Ones Place'),
        akcja('is.workflow.actions.setvariable', WFVariableName=do_zmiennej),
    ]


def zbuduj():
    akcje = [
        akcja('is.workflow.actions.comment',
              WFCommentActionText='Plan 12 tygodni: tętno i kalorie z aplikacji Zdrowie. '
                                  'Plan sam uruchamia ten skrót po „Zakończ" i podaje godzinę startu.'),
        akcja('is.workflow.actions.detect.date', WFInput=wejscie_skrotu()),
        akcja('is.workflow.actions.setvariable', WFVariableName='Start'),
        probki('Heart Rate'), *statystyka('Average', 'Avg'),
        probki('Heart Rate'), *statystyka('Maximum', 'Max'),
        probki('Active Energy'), *statystyka('Sum', 'Kcal'),
        akcja('is.workflow.actions.gettext', WFTextActionText=tekst_ze_zmiennymi([
            ADRES + '?zegarek=1&avg=', ('var', 'Avg'), '&max=', ('var', 'Max'), '&kcal=', ('var', 'Kcal'),
        ])),
        akcja('is.workflow.actions.openurl'),
    ]
    return {
        'WFWorkflowClientVersion': '2607.0.3',
        'WFWorkflowMinimumClientVersion': 900,
        'WFWorkflowMinimumClientVersionString': '900',
        'WFWorkflowIcon': {'WFWorkflowIconStartColor': 4282601983, 'WFWorkflowIconGlyphNumber': 59446},
        'WFWorkflowImportQuestions': [],
        'WFWorkflowTypes': [],
        'WFWorkflowHasShortcutInputVariables': True,
        'WFWorkflowInputContentItemClasses': ['WFStringContentItem', 'WFDateContentItem'],
        'WFWorkflowOutputContentItemClasses': [],
        'WFWorkflowHasOutputFallback': False,
        'WFQuickActionSurfaces': [],
        'WFWorkflowActions': akcje,
    }


if __name__ == '__main__':
    cel = sys.argv[1] if len(sys.argv) > 1 else 'skrot/niepodpisany.shortcut'
    with open(cel, 'wb') as f:
        plistlib.dump(zbuduj(), f, fmt=plistlib.FMT_BINARY)
    print('OK', cel)
