# Compliance Gap Analysis — Pulsante di Recesso

> ⚠️ DISCLAIMER: analisi generata da AI, NON costituisce parere legale. Far validare il testo definitivo da un legale/commercialista prima del 19/06/2026. Basata sul testo dell'implementazione e sulle fonti pubbliche sulla normativa, non su un audit legale formale.

**Sito:** silkincom.com (e-commerce moda B2C, IT) · **Data:** 2026-06-16
**Oggetto:** funzione di recesso online `/recesso` + flusso + email ricevuta
**Quadro normativo applicabile:** art. 54-bis Codice del Consumo (D.Lgs 209/2025, recepimento Dir. UE 2023/2673), in vigore **19/06/2026** · diritto di recesso artt. 52-59 Cod. Consumo (Dir. 2011/83/UE)

> NB: la skill `legal-compliance` standard copre framework USA (GDPR/CCPA/ADA/PCI…) non pertinenti al "pulsante di recesso". Ho applicato la sua struttura al quadro corretto.

---

## Scorecard

| Area | Stato | Voto |
|---|---|---|
| Pulsante visibile e accessibile (54-bis c.1) | ⚠️ Parziale | B |
| Disponibilità per tutti i 14 gg | ✅ | A |
| Etichetta chiara e inequivocabile | ✅ | A− |
| Doppia conferma (dichiarazione + funzione conferma) | ✅ | A |
| Avviso ricevimento su supporto durevole (contenuto + data/ora) | ✅ | A |
| Modulo di recesso tipo (Allegato I.B, art. 49) | ❌ Mancante | F |
| Info pre-contrattuali del diritto (art. 49) | ⚠️ Da verificare | C |
| Rimborso 14 gg, stesso mezzo (art. 56) | ✅ | A |
| Esclusioni (art. 59) | ✅ | A |
| Registro/prova della richiesta | ✅ | A |
| **Conformità complessiva 54-bis** | **⚠️ Buona con 1 gap rilevante** | **B** |

---

## Executive summary

Il pulsante di recesso copre **i requisiti centrali dell'art. 54-bis**: funzione online dedicata, doppia conferma, e avviso di ricevimento su supporto durevole con contenuto della dichiarazione + data/ora. La finestra 14 giorni, il rimborso con lo stesso mezzo e le esclusioni sono dichiarati correttamente. **Un gap rilevante**: manca il **modulo di recesso tipo** (Allegato I, parte B) che la legge impone di mettere comunque a disposizione. Due punti da rinforzare: la **visibilità del punto di accesso** (oggi footer + pagina; aggiungere il link nell'email di conferma ordine e nell'area ordine) e la **disclosure pre-contrattuale** del diritto al checkout/termini.

---

## 🔴 Critico (prima del 19/06)

### 1. Manca il modulo di recesso tipo (Allegato I, parte B Cod. Consumo)
- **Requisito:** l'art. 49 impone di fornire al consumatore il modello di modulo di recesso tipo. Il pulsante è la modalità primaria ma il modulo va comunque reso disponibile.
- **Stato attuale:** la pagina `/recesso` non offre il modulo tipo (testo scaricabile/copiabile).
- **Rischio:** informativa incompleta → in caso di omissione il termine di recesso si estende fino a **12 mesi** (art. 53); pratica contestabile.
- **Fix:** aggiungere alla pagina il testo del modulo tipo (sezione "Modulo di recesso" con il fac-simile precompilabile: destinatario SILKinCOM + indirizzo, "io sottoscritto… recedo dal contratto n…. ordinato il…/ricevuto il…, nome, indirizzo, data, firma"). Effort: Basso.

---

## 🟡 Alta priorità (entro 30 gg)

### 2. Punto di accesso al recesso poco "facilmente accessibile"
- **Requisito (54-bis c.1):** pulsante **ben visibile e facilmente accessibile** per tutto il periodo.
- **Stato attuale:** link nel footer (colonna Support) + pagina dedicata. OK come base, ma non presente dove il cliente guarda dopo l'acquisto.
- **Fix:** aggiungere il link a `/recesso` (a) nell'**email di conferma ordine**, (b) nella **pagina ordine** in area account, (c) eventualmente nell'email di spedizione. Effort: Basso.

### 3. Disclosure pre-contrattuale del diritto (art. 49)
- **Requisito:** informare il consumatore del diritto di recesso, condizioni, termini e procedura **prima** dell'acquisto (checkout/termini).
- **Stato attuale:** da verificare che i termini/checkout richiamino il diritto e linkino `/recesso`.
- **Fix:** assicurare un richiamo al diritto di recesso + link in `/termini` e/o nel riepilogo checkout. Effort: Basso.

---

## 🟢 Bassa priorità / best practice

- **Etichetta pulsante:** la legge cita "recedere dal contratto qui". Le nostre label ("Esercita il recesso ora" / "Conferma il recesso") sono chiare ed equivalenti; opzionale rendere il punto d'ingresso ancora più letterale (es. "Recedi dal contratto"). 
- **Nome cliente nella dichiarazione:** la dichiarazione usa il nome dallo `shipping_address`; se assente compare "—". Best practice: campo nome esplicito nel form o validazione.
- **Decorrenza beni multipli:** il testo copre "ultimo bene" — ok; valutare wording per ordini con consegne separate.
- **Conferma leggibilità email:** verificare resa email ricevuta su client principali.

---

## ✅ Conformi

- Funzione di recesso **online dedicata** (non solo email/PDF). 
- **Doppia conferma**: step riepilogo + bottone "Conferma il recesso" come atto definitivo.
- **Avviso di ricevimento su supporto durevole** (email) con **contenuto della dichiarazione + data e ora** di trasmissione (TZ Europe/Rome).
- **Finestra 14 giorni** dal ricevimento (o prima della consegna).
- **Rimborso entro 14 gg, stesso mezzo**, con facoltà di trattenere fino a reso/prova spedizione.
- **Esclusioni** (beni su misura/personalizzati, sigillati aperti per igiene).
- **Registro** della richiesta in DB con data/ora + numero riferimento (RC-…).
- Accessibile **senza login** (identificazione ordine + email).
- Disponibile in **7 lingue**.

---

## Roadmap

### Prima del 19/06 (critico)
1. [ ] Aggiungere il **modulo di recesso tipo** alla pagina `/recesso`.

### Entro 30 gg (alta)
2. [ ] Link a `/recesso` nell'**email di conferma ordine** + **area ordine** account.
3. [ ] Richiamo al diritto + link nel **checkout/termini**.

### Best practice
4. [ ] Label d'ingresso più letterale + campo nome nel form.
5. [ ] Verifica resa email su client principali.

---

## Limiti dell'analisi
- Valuta i segnali di conformità visibili nell'implementazione, non un parere legale.
- Non sostituisce la validazione di un legale sul testo definitivo (raccomandata prima del 19/06).
- La normativa è di recente recepimento: verificare eventuali linee guida AGCM/aggiornamenti.
