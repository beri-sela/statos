import type { ScoreDoc } from './music/types';

/** Built-in sample scores (typed from handwritten manuscripts). */
export const EXAMPLES: ScoreDoc[] = [
  {
    "id": "example-mimo",
    "title": "Mimọ",
    "subtitle": "Sanctus (Holy) in Yoruba",
    "composer": "'Messiah' Alex Ugwu",
    "doh": "Bb",
    "mode": "minor",
    "timeNum": 6,
    "timeDen": 4,
    "tempoText": "Lively",
    "bpm": 100,
    "barsPerRow": 4,
    "pickup": false,
    "parts": [
      {
        "id": "p1",
        "name": "Soprano",
        "voice": "S",
        "notes": ": : / : : | :d.d : / :(m.m :r) | l1 :d.d : / :d.d : | :t1.t1 : / :(r.r :d) | t1 : : / : : | :d.d : / :(m.m :r) | l1 :d.d : / :d.d : | :t1.t1 : / :(r.r :d) | :t1 :d /t1 :- :- | l1 :m :r /r :m :m | m :- :l1 /l1 :- :- | s1 :m :r /m :r :m | t1 :m :d /r :t1 :- | l1 :- :- /m :-.l1 :- | f :- :- /l1 :-.l1 :- | t1 :-.d :- /r :-.s1 :- | m :- :- /s1 :-.s1 :- | l1 :- :- /t1 :-.d :- | l1 :- :- /- :- :- | :>m :>r / :>r :>m | :t1 :d /t1 :- :- | l1 :-.l1 :- /m :-.d :- | r :- :l1 /l1 :d :l1 | t1 :- :- /- :- :- | d :d :t1 /t1 :d :t1 | l1 :- :- /m :-.l1 :- | f :- :- /l1 :-.l1 :- | t1 :-.d :- /r :-.s1 :- | m :- :- /s1 :-.s1 :- | l1 :- :- /t1 :-.d :- | l1 :- :- /- :- :- | :>m :>r / :>r :>m | :t1 :d /(t1 :- :- | l1) :- :- /- :- :-",
        "lyrics": " | Mi-mo mi-mo _ | oh mi-mo mi-mo | mi-mo mi-mo _ | Oh! | Mi-mo mi-mo _ | oh mi-mo mi-mo | mi-mo mi-mo _ | O-lú-wa! | Ọ-lọ-run a-wọn ọ- | mọ o-gun, | ọ-run òun a-yé _ | Kún fún o-go Rẹ. | Ho sa-na | Ló kè ọ- | run ho-sa-na | Ló kè ọ- | run Ho-sa | na | Ló-kè! ọ-run! | O-lú-wa! | I-bu-kún ni | fún e-ni t'ón bọ | wá, | Ló-rú-kọ O-lú-wa! | Ho sa-na | Ló kè ọ- | run ho-sa-na | Ló kè ọ- | run Ho-sa | na | Ló-kè! ọ-run! | O-lú-wa! | "
      },
      {
        "id": "p2",
        "name": "Alto",
        "voice": "A",
        "notes": ": : / : : | l1 :-.l1 : /l1 :-.l1 : | l1 :-.l1 : /l1 :-.l1 : | l1 :-.l1 : /l1 :-.l1 :- | se1 : : / : : | l1 :-.l1 : /l1 :-.l1 : | l1 :-.l1 : /l1 :-.l1 : | l1 :-.l1 : /l1 :-.l1 :- | :se1 :l1 /se1 :- :- | (l1 :- :- /- :- :- | s1) :- :- /- :- :- | - :- :- /(l1 :- :- | se1) :- :l1 /t1 :se1 :- | m1 :- :- /l1 :-.m1 :- | l1 :- :- /f1 :-.f1 :- | l1 :- :- /s1 :- :- | s1 :- :- /m1 :-.m1 :- | s1 :- :- /s1 :-.l1 :- | f1 :- :- /- :- :- | :>l1 :>se1 / :>se1 :>l1 | :se1 :l1 /se1 :- :- | m1 :-.m1 :- /l1 :-.m1 :- | s1 :- :- /- :s1 :s1 | l1 :-.f1 :- /s1 :- :- | l1 :l1 :se1 /se1 :l1 :se1 | m1 :- :- /l1 :-.m1 :- | l1 :- :- /f1 :-.f1 :- | l1 :- :- /s1 :- :- | s1 :- :- /m1 :-.m1 :- | s1 :- :- /s1 :-.l1 :- | f1 :- :- /- :- :- | :>l1 :>se1 / :>se1 :>l1 | :se1 :l1 /(se1 :- :- | m1) :- :- /- :- :-",
        "lyrics": " | Mi-mo mi-mo | mi-mo mi-mo | mi-mo mi-mo | oh! | Mi-mo mi-mo | mi-mo mi-mo | mi-mo mi-mo | O-lú-wa! | uh |  | eh | o-go Rẹ. _ | Ho sa-na | Ló kè ọ- | run eh | Ló kè ọ- | run Ho-sa | na | Ló-kè! ọ-run! | O-lú-wa! | I-bu-kún ni | fún e-ni | t'ón-bọ wá, | Ló-rú-kọ O-lú-wa! | Ho sa-na | Ló kè ọ- | run eh | Ló kè ọ- | run Ho-sa | na | Ló-kè! ọ-run! | O-lú-wa! | "
      },
      {
        "id": "p3",
        "name": "Tenor",
        "voice": "T",
        "notes": ":m.m :-.m /m :m.m :-.l1 | - :m.m : / :r.r : | :m.m :-.m /m :m.m :-.s1 | - :m.m : / :r.r :- | - :m.m :-.m /m :m.m :-.l1 | - :m.m : / :r.r : | :m.m :-.m /m :m.m :-.s1 | - :m.m : / :r.r :- | :r :m /r :- :- | (m :- :- /r :- :- | d) :- :d /d :- :t1 | t1 :- :- /(r :- :- | t1) :- :m /f :r :- | l1 :- :- /d :-.l1 :- | d :- :- /l1 :-.l1 :- | r :- :- /t1 :- :- | - :- :- /- :- :- | d :- :- /m :- :- | r :- :- /- :- :- | >m : : />m : : | :r :m /r :- :- | l1 :-.l1 :- /d :-.l1 :- | d :- :r /r :m :d | r :- :- /- :- :- | m :m :r /r :m :r | l1 :- :- /d :-.l1 :- | d :- :- /l1 :-.l1 :- | r :- :- /t1 :- :- | - :- :- /- :- :- | d :- :- /m :- :- | r :- :- /- :- :- | >m : : />m : : | :r :m /(r :- :- | de) :- :- /- :- :-",
        "lyrics": "Mi-mo mi mo mi-mo oh | Mi-mo mi-mo | mi-mo mi mo mi-mo oh | mi-mo mi-mo | Mi-mo mi mo mi-mo oh | Mi-mo mi-mo | mi-mo mi mo mi-mo oh | mi-mo mi-mo | O-lú-wa! | uh _ | ọ-mọ o- _ | gun eh | o-go Rẹ. _ | Ho sa-na | Ló kè ọ- | run eh |  | Ho sa | na | eh! eh!! | O-lú-wa! | I-bu-kún ni | fún e-ni t'ón bọ | wá, | Ló-rú-kọ O-lú-wa! | Ho sa-na | Ló kè ọ- | run eh |  | Ho sa | na | eh! eh!! | O-lú-wa! | "
      },
      {
        "id": "p4",
        "name": "Bass",
        "voice": "B",
        "notes": ": : / : : | >l1 :- : />l1 :- : | >f1 :- : />f1 :- : | >s1 :- : />s1 :- :- | m1 : : / : : | >l1 :- : />l1 :- : | >f1 :- : />f1 :- : | >s1 :- : />s1 :- :- | m1 :- :- /d :-.t1 :- | (l1 :- :- /- :- :- | f1) :- :- /- :- :- | s1 :- :- /(s1 :- :- | m1) :- :- /- :- :- | l2 :- :- /l1 :- :- | r1 :- :- /- :- :- | s1 :- :- /- :- :- | d1 :- :- /d1 :- :- | f1 :- :- /f1 :-.m1 :- | t2 :- :- /- :- :- | >m1 : : />m1 : : | m1 :- :- /d :-.t1 :- | l1 :-.l1 :- /d :-.m1 :- | f1 :- :- /- :- :- | s1 :-.s1 :- /t1 :-.r1 :- | m1 :- :- /- :- :- | l2 :- :- /l1 :- :- | r1 :- :- /- :- :- | s1 :- :- /- :- :- | d1 :- :- /d1 :- :- | f1 :- :- /f1 :-.m1 :- | t2 :- :- /- :- :- | >m1 : : />m1 : : | m1 :- :- /d :-.(t1 :- | l1) :- :- /- :- :-",
        "lyrics": " | Mi mo | mi mo | mi mo | oh! | Mi mo | mi mo | mi mo | O lú-wa! | uh |  | eh _ |  | Ho sa | na | Ló | kè ọ | run Ho-sa | na | eh! eh!! | O lú-wa! | I-bu-kún ni | fún | e-ni t'ón-bọ | wa. | Ho sa | na | Ló | kè ọ | run Ho-sa | na | eh! eh!! | O lú-wa! | "
      }
    ],
    "marks": " |  |  |  |  |  |  |  | [FIRST TIME] | 𝄋 S1 |  |  | D.S.1 |  |  |  |  |  |  | D.C. | [SECOND TIME] | 𝄋 S2 |  |  | D.S.2 |  |  |  |  |  |  | D.C. | [FINAL TIME] | Fine",
    "footer": "A Yoruba “Sanctus”. Composed by Alex Ugwu, 28 January 2021. © AlexMessiah2021",
    "updatedAt": 0
  },
  {
    "id": "example-alleluia",
    "title": "Alleluia Amen",
    "subtitle": "cf Jn 17:17",
    "composer": "Ndem Brian (All for God)",
    "doh": "C",
    "mode": "major",
    "timeNum": 3,
    "timeDen": 4,
    "tempoText": "Moderately fast",
    "bpm": 110,
    "barsPerRow": 5,
    "pickup": false,
    "parts": [
      {
        "id": "p1",
        "name": "Soprano",
        "voice": "S",
        "notes": ":m.m :m.m | l :m :- | :m.m :m.m | l :m :- | - :m.m :m.m | l :m :l | d' :-.d' :d' | t :l :s | l :- :- | : : | m :m :m | f :- :f | m :- :- | - :m :m | l :- :- | t :- :d' | d' :- :- | r' :- :- | m' :- :- | - :- :- | d :- :d | t :l :t | d :- :- | - :- :l | d' :l.l :l.l | t :l :t | d' :d'.d' :d'.d' | r' :d' :r' | m' :m.m :m.m | l :m :- | - :m.m :m.m | l :m :- | - :m.m :m.m | l :m :l | d' :-.d' :d' | t :l :s | l :- :-",
        "lyrics": "Al-le lu-ia | A-men | Al-le lu-ia | A-men | Al-le lu-ia | A-men A- | men Al-le- | lu-ia A- | men |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | men Al-le lu-ia | A-men | Al-le lu-ia | A-men | Al-le lu-ia | A-men A- | men Al-le- | lu-ia A- | men"
      },
      {
        "id": "p2",
        "name": "Alto",
        "voice": "A",
        "notes": ": : | : :d | m : : | : :d | r : : | : :d | f :-.f :l | s :m :r | m :- :- | : : | d :d :d | t1 :- :t1 | d :- :- | - :d :d | l :- :- | se :- :- | l :- :- | t :- :- | d' :- :- | - :- :- | l :- :l | s :m :s | l :m.m :m.m | l :m :d | f :f.f :f.f | s :m :s | l :l.l :l.l | t :l :s | l :- :- | : :d | m : : | : :d | r : : | : :d | f :-.f :l | s :m :r | m :- :-",
        "lyrics": " | A- | lle | lu- | ia |  |  |  |  |  | Your word is | truth, O | Lord; | con-se- | crate | us | to | the | truth. |  | Al-le- | lu-ia A- | men Al-le lu-ia | A-men A- | men Al-le lu-ia | A-men A- | men Al-le lu-ia | A-men A- | | A- | lle | lu- | ia | A- |  |  | "
      },
      {
        "id": "p3",
        "name": "Tenor",
        "voice": "T",
        "notes": ": : | : :l | d' : : | : :l | t : : | : :l | l :-.l :l | t :l :t | d' :- :- | : : | s :s :s | s :- :s | m :- :- | - :l :s | d' :- :l | t :- :- | d' :- :- | s :- :- | l :l.l :l.l | m' :l :- | d' :- :m' | r' :d' :t | d' :- :- | d' :l :f | r' :r'.r' :r'.r' | r' :d' :m' | m :m.m :m.m | m :r :m | de :- :- | : :l | d' : : | : :l | t : : | : :l | l :-.d' :d' | t :l :t | d' :- :-",
        "lyrics": " |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | Al-le lu-ia _ | A-men |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | "
      },
      {
        "id": "p4",
        "name": "Bass",
        "voice": "B",
        "notes": ": : | : :m | l : : | : :m | s : : | : :d | f :-.f :f | m :d :t1 | l1 :- :- | : : | m :m :m | r :- :r | d1 :- :- | - :l :s | f :- :- | m :- :s | f :- :- | s :- :- | l : :l | l :t :s | f :- :- | s :- :m | l :l1.l1 :l1.l1 | m :l1 :l1 | f :f.f :f.f | s :m :s | l :l.l :l.l | t :s :s | l :- :- | : :m | l : : | : :m | s : : | : :d | f :-.f :f | m :d :t1 | l1 :- :-",
        "lyrics": " |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | A- _ | men Al-le- | lu- | ia A- | men Al-le lu-ia | A-men A- |  |  |  |  |  |  |  |  |  |  |  |  | "
      }
    ],
    "marks": " |  |  |  |  |  |  |  | D.C. |  | p |  |  | f |  |  | ff |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | D.S., Fine",
    "footer": "Qui cantat bene, bis orat (He who sings well, prays twice)",
    "updatedAt": 0
  }
];
