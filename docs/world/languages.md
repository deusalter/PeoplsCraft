# The languages

This chapter is for the people who write game text and add names. It says which tongue names which kind of thing, gives the sounds of the two born tongues and the ordered changes that made them, and says how to make a new name and check it.

Three files stand behind it. `lang/rules.json` holds the sound changes, `lang/derive.mjs` applies them, and `lang/roots.json` lists the words that names are made from. Anyone who runs the script can make every name in a born tongue again from its roots, and a name the script does not give is wrong. Section numbers point to the other chapters.

## L.1 Plain English and the three tongues

**Plain English is the ground.** All game text is English. Ordinary things have ordinary names: earth, stone, oak, plank, torch, pick, bread. The plain words the ground chapter fixes are used as fixed: feeders, lees, holder, charge, edge, peopl, peopls. A thing gets a name in a tongue only when some people on the ground had a reason to name it and no plain English word is true of it.

**The cutters' tongue** is Sanskrit proper. It is the speech of the cutting trade on every world. The first comers brought it up the dead road, and every arrival still brings it (1.4, 2.3). It names things of the wider cosmos and of the ward trade that have no plain word. The frame terms in `borrowed.md` belong to it and are spelled as that file spells them. It is used sparingly (L.7).

**The householders' tongue** is what that speech became in the mouths of the born. It has been wearing since the first children were born on the ground, through the ten to forty generations of the first comers and the twenty to sixty and more since (2.1). Nobody has come up the road in that time to set it right. It names what the born named: the kinds of country, the kinds of feeder and the eight great ones, the stations and the trades, the townsfolk, and the matter found only on this ground, whose names came down with the trades.

**The sand-country tongue** is its sister. The people of the sand walked away from the hearths when the hunting stopped (2.4), and their speech has gone its own way since. It names their country, their fighters and their things, and it has its own forms of the words both peoples share, among them the words for a person, for a peopl and for craft.

Chapter 5 says the two born peoples speak the same tongue (5.6). That holds as it holds of two countries that share a speech: each follows the other's talk and knows the other by the first word spoken. Names are where the two differ most (L.6).

There is no fourth tongue. Nothing mortal of the root's own world survives (2.2), nobody lives in the hollow or on the islands (5.4), no stone on the ground carries words (2.3), and feeders have no speech (1.2). A thing in those places has the name the first comers gave it, as it came down through the born, or a plain English name.

| Kind of thing | Name shown | Namer |
| --- | --- | --- |
| Ordinary matter, tools, food, furniture | Plain English | nobody |
| Things the ground chapter fixes in plain words | Plain English, as fixed | as that chapter says |
| Things of the wider cosmos, and parts of the ward trade with no plain word | The cutters' tongue | cutters |
| The kinds of country | The householders' tongue | the born |
| The sand country and what stands in it | The sand-country tongue, with the householders' name in the glossary | the sand-country people |
| The kinds of feeder and the eight great ones | The householders' tongue on tooltips and boss bars | the born |
| Stations built round remains, trades, townsfolk | The householders' tongue | the born |
| Metals and other matter found only on this ground | The householders' tongue | the first comers, through the born |
| Sand-country fighters, tokens and fires | The sand-country tongue | the sand-country people |

Two peoples may have two names for one thing where the bible has both speak of it. The tooltip shows the householders' name or the plain English one, a sand-country speaker says his own, and the glossary lists both.

## L.2 What a name is

A name is what some particular people called a thing, for a reason they had. Before a name is made, two things are written down: who named it, and why. The namer is the born, the sand-country people, the cutters, or nobody, which means plain English. The reason comes from the bible: what that people knew about the thing, believed about it or used it for.

Where the bible says a people believes something false about a thing, the name carries the belief. Householders say each great feeder was set over its country by the forebears (4.11), so their names for the eight are names for something set over a country. They say the things of the dark night come down from the moon (1.8), so their name for that kind has the moon in it. The sand-country people held the burrower above themselves (5.3), and their name for it is the name of a thing that holds a country.

A name never explains the lore, winks at the player or makes a pun. A tooltip does not gloss its own name. The glossary gives each name's meaning to the people building the game.

## L.3 Reading the born tongues

Both born tongues are written with English letters and three long vowels, ā ī ū. There are no dots under letters, no apostrophes and no hyphens. Every letter is sounded.

- a as in *about*, ā as in *father*; i as in *bit*, ī as in *machine*; u as in *put*, ū as in *rule*; e as in *they*; o as in *go*.
- g is always hard. ch is the sound in *church*. sh is the sound in *ship*. z is the sound in *zoo*.
- A doubled consonant is held for twice the time, as the k is in *bookcase*. cch is a held ch.
- h is sounded wherever it is written, between vowels and after n or m.

## L.4 The householders' tongue

**Its speakers.** Householders, who learn the hearth and the trade from the one before them. Their speech stands nearer the old trade speech than the sand-country tongue does. The old clusters of consonants are still there as doubled consonants, and the old breath after a stop is still there as an h between vowels.

**Sounds.** Consonants: p b t d k g ch j m n s h y r l v. Vowels: a ā i ī u ū e o. There is no sh, no z and no f. Any consonant but h, r and v can be doubled. The only other clusters are a nasal before a stop or s (mb, nt, nd, nk, ng, nch, nj, ns), and nh, mh and nv.

**Syllables.** A syllable is a vowel with one consonant before it at most, and one after it at most. A long vowel never stands before a doubled consonant or a cluster, and never at the end of a word. A word of two syllables ends in a vowel. A longer word often ends in a single consonant.

**Stress.** Stress falls on the last syllable that has a long vowel or is closed by a consonant, leaving out a final syllable with a short vowel. If there is none, it falls on the first syllable: *HAT-ta, PAB-bat, su-VAN-na, an-da-KĀR, NA-gar.*

**By ear.** Doubled consonants, h between vowels, clipped ends: *Hatta, Muha, Pabbat, Suvanna, Andakār.*

**The changes, in order.** The script applies each rule to the whole word and then moves to the next. Each example shows a form before and after that one change. A stop with breath is written kh, th, bh and so on, as Sanskrit writes it.

| | Change | Example |
| --- | --- | --- |
| 1 | ai flattens to e and au to o | *taila>tela*, *gaura>gora* |
| 2 | A final ṛ becomes ā, and every final consonant falls | *pitṛ>pitā*, *rājan>rāja* |
| 3 | ṛ becomes i at the start of a word or before a syllable with i, u before a syllable with u, and a elsewhere | *gṛha>gaha*, *vṛścika>viścika* |
| 4 | ḥ doubles the consonant after it; ṃ becomes n or m, and before h it lengthens the vowel and falls | *duḥkha>dukkha*, *siṃha>sīha* |
| 5 | kṣ becomes kkh; jñ becomes ññ; ts and ps become cch | *akṣi>akkhi*, *prajñā>praññā* |
| 6 | A sibilant before k, t, p or c is lost; the stop doubles and takes breath | *hasta>hattha*, *śuṣka>śukkha* |
| 7 | A sibilant or h before a nasal changes places with it and is said h | *uṣṇa>uṇha*, *grīṣma>grīmha* |
| 8 | ty, dy and ny become cc, jj and ññ; hy becomes jjh and hv becomes bbh | *satya>sacca*, *madhya>majjha* |
| 9 | A vowel opens ry, rh, dm, tn, and a consonant before l at the start of a word; ml inside a word becomes mbil; hr at the start of a word loses its h | *sūrya>sūriya*, *padma>paduma* |
| 10 | r next to another consonant is lost and that consonant doubles; mr becomes mb | *mārga>māgga*, *putra>putta* |
| 11 | Of two unlike stops the first becomes the second; a nasal after a stop is lost and the stop doubles; nm becomes mm and mn becomes nn | *sapta>satta*, *dugdha>duddha* |
| 12 | dv becomes b at the start of a word and bb inside it; elsewhere y, v and l next to a stronger consonant are lost and it doubles; vy and vv harden to bb | *dvāra>bāra*, *pakva>pakka* |
| 13 | Three consonants make two; a doubled consonant is single after a nasal and at the start of a word | *canddda>canda*, *tthāna>thāna* |
| 14 | A long vowel shortens before two consonants | *māgga>magga*, *rātti>ratti* |
| 15 | The three sibilants are one s | *śilā>silā*, *pāṣāṇa>pāsāṇa* |
| 16 | A stop with breath, alone between vowels, wears to h; all other breath is lost | *mukha>muha*, *megha>meha* |
| 17 | The curled consonants and the five nasals fall in with t, d, n and m | *kūṭa>kūta*, *vaṇṇa>vanna* |
| 18 | A long vowel at the end of a word is short | *silā>sila*, *nadī>nadi* |
| 19 | In a word of three syllables or more a final a, i or u falls after a single consonant, unless that consonant is h, y or v | *nagara>nagar*, *pāsāna>pāsān* |

After the changes the spelling is set: c is written ch, and doubled c is written cch.

**Joining two words.** The describing word comes first. The two are joined before the changes run, so the joined word wears as one word. Three things happen at the join. A final vowel falls before a vowel. A long final vowel is short. The head of the second word is worn as the inside of a word, so a cluster there doubles and a stop with breath there wears to h: *jala + sthāna* gives Jalattān, and *vālukā + bhūmi* gives Vālukahūm. For that reason the ending for a country is *-deśa*, which wears cleanly.

**Endings and first words.**

| Word | Makes | Example | Name |
| --- | --- | --- | --- |
| *-kāra* | one who does or makes X | *kumbha + -kāra* | Kumbakār |
| *-śālā* | place of X, under a roof | *loha + -śālā* | Lohasāl |
| *-deśa* | place of X, a country | *tṛṇa + -deśa* | Tanades |
| *-maya* | thing made of X | *śilā + -maya* | Silamaya |
| *-ka* | little X | *kumbha + -ka* | Kumbak |
| *mahā* | great X | *mahā + kūpa* | Mahakūp |
| *-gaṇa* | a host of X | *pakṣin + -gaṇa* | Pakkigan |

In neither tongue does a name change for number. Game text adds an English s where it needs one, as it does to peopl.

**Twenty worked names.** The stages are the forms the script prints on the way. The glossary says which names the game uses.

| From | Stages | Name |
| --- | --- | --- |
| *hasta*, hand | hasta>hattha | **Hatta** |
| *gṛhapati*, master of a house | gṛhapati>gahapati | **Gahapat** |
| *manuṣya*, a human being | manuṣya>manuṣṣa | **Manussa** |
| *deśika*, one who knows the country, a guide | deśika>desika | **Desik** |
| *karmāra*, a smith | karmāra>kammāra | **Kammār** |
| *vaidya*, a physician | vaidya>vedya | **Vejja** |
| *vāhaka*, a carrier | vāhaka | **Vāhak** |
| *rekhā + -kāra*, maker of lines | rekhā+kāra>rekhakāra>rehakāra | **Rehakār** |
| *poṣaka*, one who feeds, a breeder | poṣaka>posaka | **Posak** |
| *loha + -śālā*, iron hall | loha+śālā>lohaśālā>lohasālā>lohasāla | **Lohasāl** |
| *hima + -deśa*, snow country | hima+deśa>himadeśa>himadesa | **Himades** |
| *paṅka + -deśa*, mire country | paṅka+deśa>paṅkadeśa>paṅkadesa>pankadesa | **Pankades** |
| *kaṇṭaka*, thorn | kaṇṭaka>kantaka | **Kantak** |
| *praroha + śāvaka*, young of the sprout | praroha+śāvaka>prarohaśāvaka>pparohaśāvaka>parohaśāvaka>parohasāvaka | **Parohasāvak** |
| *chāyā*, shade | chāyā>cāyā>cāya | **Chāya** |
| *candra + śāvaka*, young of the moon | candra+śāvaka>candraśāvaka>canddaśāvaka>candaśāvaka>candasāvaka>candasāvak | **Chandasāvak** |
| *suṣira + candra*, hollow moon | suṣira+candra>suṣiracandra>suṣiracandda>suṣiracanda>susiracanda | **Susirachanda** |
| *bali + śilā*, offering stone | bali+śilā>baliśilā>balisilā>balisila | **Balisil** |
| *deśa + pati*, master of a country | deśa+pati>deśapati>desapati | **Desapat** |
| *amāvāsyā*, the night of new moon | amāvāsyā>amāvāssā>amāvassā | **Amāvassa** |

## L.5 The sand-country tongue

**Its speakers.** The sand-country people, who gave up the pot and the hearth and everything that went with them (5.3). Their speech has worn further than the householders'. Doubled consonants have opened into long vowels, the breath is gone without trace, and consonants between vowels have softened.

**Sounds.** Consonants: p b t d k g s sh z m n h y r l. Vowels: a ā i ī u ū e o. There is no ch, no j, no v and no f. No consonant is doubled. The only clusters are a nasal before a stop, s, sh or z (mb, nd, ng, nt, nk, ns, nsh, nz).

**Syllables.** A syllable is a vowel with one consonant before it at most. Only a nasal can close a syllable, and only inside a word. Every word ends in a vowel. Long vowels are common and stand before any single consonant, but never at the end of a word.

**Stress.** Stress falls on the last long vowel. If there is none it falls on the syllable before a nasal cluster, and failing that on the first syllable: *HĀ-ta, shu-BĀ-na, an-da-GĀ-ra, KAN-da-ga, NA-ga-ra.*

**By ear.** Long vowels, no doubled consonants, sh and z and b, every word open at the end: *Hāta, Muka, Pābada, Shubāna, Andagāra.*

**The changes, in order.** Changes 1, 2, 4, 6 to 8 and 10 to 12 are the householders' changes too: the speech of the born before the two peoples parted. Changes 3, 5, 9 and 13 were differences of country even then. Both tongues came to change 20 separately. The rest are the sand country's own.

| | Change | Example |
| --- | --- | --- |
| 1 | As change 1 of the householders' tongue | *taila>tela* |
| 2 | As change 2 of the householders' tongue | *pitṛ>pitā* |
| 3 | ṛ becomes i | *gṛha>giha*, *mṛga>miga* |
| 4 | As change 4 of the householders' tongue | *duḥkha>dukkha* |
| 5 | kṣ becomes cch; jñ becomes ṇṇ; ts and ps become cch | *akṣi>acchi*, *prajñā>praṇṇā* |
| 6 | As change 6 of the householders' tongue | *hasta>hattha* |
| 7 | As change 7 of the householders' tongue | *uṣṇa>uṇha* |
| 8 | As change 8 of the householders' tongue | *satya>sacca* |
| 9 | ry becomes yy; a vowel opens rh, and a consonant before l at the start of a word; ml becomes mm; hr at the start of a word loses its h | *sūrya>sūyya*, *kleśa>kileśa* |
| 10 | As change 10 of the householders' tongue | *mārga>māgga* |
| 11 | As change 11 of the householders' tongue | *sapta>satta* |
| 12 | As change 12 of the householders' tongue | *dvāra>bāra* |
| 13 | Three consonants make two; a doubled consonant is single after a nasal and at the start of a word; h after a nasal is lost and the nasal doubles | *canddda>canda*, *tthāna>thāna* |
| 14 | Before a consonant, ava draws together to o and aya to e | *lavaṇa>loṇa*, *pavana>pona* |
| 15 | k, t and p alone between vowels, or after a nasal, become g, d and b; ṭ becomes ḍ after a nasal; ṭ and ḍ alone between vowels become r | *loka>loga*, *śīta>śīda* |
| 16 | A doubled consonant becomes single, and a short vowel before it grows long | *hattha>hātha*, *aggi>āgi* |
| 17 | All breath is lost; the curled consonants and the five nasals fall in with t, d, n and m | *hātha>hāta*, *megha>mega* |
| 18 | Every sibilant is said sh (written ś until the spelling step); then c becomes s | *sāra>śāra*, *canda>sanda* |
| 19 | j becomes z, and so does y at the start of a word; v becomes b | *jala>zala*, *yūta>zūta* |
| 20 | As change 18 of the householders' tongue | *śilā>śila* |

After the changes the spelling is set: the one sibilant is written sh.

**Joining two words.** The describing word comes first. Each word is worn down by itself, and the two are then set side by side. Every long vowel of the first word is short. The first word ends in its old stem vowel, which falls before a vowel. So *vālukā + deśa* gives Balugadesha, and *kāca + śakala* gives Kasashagala. An ending is older than this habit and is joined the householders' way, before the changes run: *kumbha + -kāra* gives Kumbagāra, where the k has softened as it does inside a word.

**Endings and first words.**

| Word | Makes | Example | Name |
| --- | --- | --- | --- |
| *-kāra* | one who does or makes X | *kumbha + -kāra* | Kumbagāra |
| *-sthāna* | place of X | *agni + -sthāna* | Āgītāna |
| *-deśa* | place of X, a country | *tṛṇa + -deśa* | Tinadesha |
| *-maya* | thing made of X | *śilā + -maya* | Shilamaya |
| *-ka* | little X | *kumbha + -ka* | Kumbaga |
| *mahā* | great X | *mahā + kūpa* | Mahakūba |
| *-yūtha* | a pack of X | *pakṣin + -yūtha* | Pāsiyūta |

**Twenty worked names.**

| From | Stages | Name |
| --- | --- | --- |
| *maru*, waste, desert | maru | **Maru** |
| *vālukā + deśa*, sand country | vālukā>vālugā>bālugā>bālugā+deśa>balugadeśa | **Balugadesha** |
| *agni*, fire | agni>aggi | **Āgi** |
| *agni + -sthāna*, place of the fire | agni+sthāna>agnisthāna>agnitthāna>aggitthāna>āgīthāna | **Āgītāna** |
| *dāhaka*, one who burns | dāhaka | **Dāhaga** |
| *bhasman*, ashes | bhasman>bhasma>bhamha>bhamma>bhāma | **Bāma** |
| *kāca + śakala*, fragment of glass | kāca>kāsa; śakala>śagala>kāsa+śagala>kasaśagala | **Kasashagala** |
| *yodha*, a fighter | yodha>yoda | **Zoda** |
| *indhana*, fuel | indhana | **Indana** |
| *maru + dhara*, holding the waste | dhara>dara>maru+dara | **Marudara** |
| *manuṣya*, a human being | manuṣya>manuṣṣa>manūṣa>manūśa | **Manūsha** |
| *śilpa*, craft | śilpa>śippa>śīpa | **Shīpa** |
| *khādaka*, an eater | khādaka>khādaga | **Kādaga** |
| *mahā + khādaka*, great eater | khādaka>khādaga>kādaga>mahā+kādaga | **Mahakādaga** |
| *palāyita*, one who has fled | palāyita | **Palāyida** |
| *citā*, a pyre | citā>cidā>sidā | **Sida** |
| *kṣāra*, ashes, lye | kṣāra>cchāra>chāra>cāra | **Sāra** |
| *kumbha + -kāra*, maker of pots | kumbha+kāra>kumbhakāra>kumbhagāra | **Kumbagāra** |
| *nidhāna*, a store, hoard | nidhāna | **Nidāna** |
| *lavaṇa*, salt | lavaṇa>loṇa | **Lona** |

## L.6 Telling the two apart

The two tongues wear the same roots, so their words can be seen to be kin.

| Sanskrit | Meaning | Householders | Sand country |
| --- | --- | --- | --- |
| *hasta* | hand | Hatta | Hāta |
| *agni* | fire | Aggi | Āgi |
| *candra* | moon | Chanda | Sanda |
| *parvata* | mountain | Pabbat | Pābada |
| *suvarṇa* | gold | Suvanna | Shubāna |
| *andhakāra* | darkness | Andakār | Andagāra |
| *kaṇṭaka* | thorn | Kantak | Kandaga |
| *lavaṇa* | salt | Lavan | Lona |
| *sphaṭika* | crystal, quartz | Patik | Pariga |
| *kṣetra* | field, ground, place | Ketta | Seta |
| *jala* | water | Jala | Zala |

A doubled consonant, a ch, a j, a v or a final consonant means the householders' tongue. A long vowel before a single consonant where the householders double, or an sh, a z or a b where they have s, j or v, means the sand country. Some short words are the same in both, as *Giri* (mountain) and *Hima* (snow) are, and a name that must be known for one people's at sight is not built on such a word alone.

## L.7 The cutters' tongue

The cutters' tongue is written as Sanskrit is written in Roman letters, with every mark. The rules are short.

1. A word is used only if it is in a dictionary with the sense wanted. The root list gives each word's page in Monier-Williams, *A Sanskrit-English Dictionary* (1899), and a word that is not in the root list is added to it first.
2. The gloss in the glossary is the dictionary's sense. A wrong gloss is worse than no name.
3. A word is written in its stem form, in full, with its marks: *sāra*, never *sara*. It takes no English plural.
4. A compound is made only of words on the root list, plainly, with the describing word first, and the glossary says that it is a new compound. A compound the dictionary already has is better.
5. No name of a god, of a figure of a real epic or of a living faith is used, and no word is used for the sound of it. A Sanskrit word names a thing. It does not make a thing deeper.

This register is small on purpose. Most of what a cutter knows has a plain English word.

## L.8 Making a new name

1. **Ask whether the thing needs a name.** If a plain English word is true of it, use the word. A present name that is two evocative nouns glued together, or cute, or wrong by the bible, is replaced by the plain word for what the thing is.
2. **Write down the namer and the reason** (L.2). If no people on the ground had a reason to name the thing, it has a plain English name.
3. **Pick the register** from the table in L.1.
4. **Pick the root or roots** from `lang/roots.json` by their sense. One root is best. Two are joined when the namer would have joined them: a country named for what covers it, a trade for what it makes, a young animal for its kind. Three words are never joined. A root marked `skip` for a tongue is not used in that tongue, and a root marked `alone` is used there only inside a joined name.
5. **Run the script.**

   ```
   node lang/derive.mjs hearth hima -deśa
   node lang/derive.mjs sand vālukā deśa
   ```

   It prints each stage and the name. A leading hyphen marks an ending. The name is taken as printed. No single name is adjusted by hand. If a word comes out badly, pick another root.
6. **Read it aloud and check its length.** Aim for four to twelve letters. Nothing shown in the inventory may be longer than 18 characters, spaces counted, and nothing on a boss bar longer than 24. A name may pair a word of a tongue with an English word, as two words.
7. **Add it to the name map** and check the whole map:

   ```
   node lang/derive.mjs --check names.json
   ```

   The script derives every name in a born tongue again and fails on any that differs, on a root that is missing or skipped, and on a name over its length. An entry looks like this:

   ```
   { "key": "tundra", "name": "Himades", "tongue": "hearth", "from": ["hima", "-deśa"],
     "other": [{ "name": "Himadesha", "tongue": "sand", "from": ["hima", "deśa"] }] }
   ```

   `tongue` is `hearth`, `sand`, `cutters`, `frame` for a term whose spelling `borrowed.md` fixes, or `plain`. `limit` sets a length other than 18. A name of two words gives `from` as a list of lists, and an English word in it is written `{ "plain": "Stone" }`.
8. **Write the glossary line**: key, name, tongue, roots, meaning, namer, reason, and any other people's name for the same thing. Internal keys never change.

**Adding a root.** Find the word in the dictionary and confirm the sense. Add a line to `lang/roots.json` with the headword, its part of speech, the sense used and the page. Then run `node lang/derive.mjs --roots --fill`, which writes both daughter forms, and `node lang/derive.mjs --roots`, which stops if two roots have come out alike in one tongue. When that happens, or when a form reads badly in a language many players speak, mark the root `skip` for that tongue with the reason, or choose another word.

**Changing a rule.** A rule changes every word it touches. After any change to `lang/rules.json`, run `node lang/derive.mjs --selftest`, fill the roots again and check the name map. A rule is never changed to mend one name.

**What is not allowed in any register.**

- Two evocative English nouns glued into one word.
- The endings -ite and -ium on an invented mineral.
- A title of the shape "the X of Y".
- An adjective and a noun for one of the eight.
- Keeper or keeping, the office words and the temple words of the README.
- A hyphen or an apostrophe inside a name.
- A word of a tongue with an English ending put on it, or the other way about.

## L.9 The word for a peopl

The born word for a person is *manuṣya* as each people says it: Manussa at a hearth, Manūsha at a fire. Of an arrival both peoples say that word with its last sound left out, Manuss and Manūsh (1.5). These two are the only forms in either tongue made by hand, because leaving the sound out is something speakers do on purpose. The game does not show them. Its English writes peopl and peopls in every mouth, and writes Peopls Craft for the trade, whose word is Sippa at a hearth and Shīpa at a fire.

## L.10 Letters

The born tongues use six letters outside plain English: ā ī ū and their capitals Ā Ī Ū.

The cutters' tongue, as far as the root list and the frame terms go, adds thirteen: ṛ ṅ ñ ṭ ḍ ṇ ś ṣ ṃ and the capitals Ṛ Ś Ṣ Ṭ.

That is nineteen letters in all. `lang/rules.json` lists both sets, and the script refuses a name with a letter outside them. A new root that needs another letter adds it there first.

## L.11 What the tongues are never used for

- **Anything that has an effect.** No word, in any tongue, does anything (rule 7 of the README). No name is a power, and knowing a name gives nothing.
- **Speech.** Townsfolk and fighters speak plain English. Nobody speaks a sentence of a born tongue, and neither tongue has a grammar beyond the joining rules here. No greeting, saying, song or oath is made in them.
- **Writing on stone.** No stone on the ground carries words (2.3). The cut lines are there to be driven.
- **The earlier world.** Nothing in the hollow or on the islands has a name older than the first comers (2.2).
- **Feeders' own names.** Feeders have no speech. Every name of a feeder is a name people gave it.
- **Ordinary things.** A torch is a torch. A word of any tongue laid over a thing that has a plain name is decoration, and is cut.
- **Gods, epics and living faiths.** No name is taken from them, and a form that falls on such a name by accident is marked `skip`.
- **Ranks and offices.** No rank, office, order or title is named in them (rule 6 of the README).
- **Jokes.** No pun, no wink, no name that reads as an English word by design.

## L.12 Open

- Section 5.6 says the two born peoples speak the same tongue. This chapter reads that as two speeches of one tongue (L.1). The sentence there may want a clause saying so.
- The bible does not say how far an arrival, who speaks the trade's speech, follows a householder at first hearing. Game text is English and does not have to settle it.
