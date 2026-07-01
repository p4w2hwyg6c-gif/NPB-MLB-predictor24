

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { playerName, year } = req.body;
  if (!playerName) return res.status(400).json({ error: '選手名が必要です' });

  const prompt = `NPB選手「${playerName}」${year ? `（${year}年時点）` : ''}のMLB移籍契約を予測。
NPB出身でない・MLB所属なら{"found":false}のみ返す。NPB選手なら成績が悪くてもfound:trueで返す。
出力はJSONのみ。コードブロック・説明文禁止。

{
"found":true,
"name":"選手名","team":"球団","age":年齢数値,"type":"投手or野手","position":"ポジション",
"sl1":"項目名","sv1":"値","sl2":"項目名","sv2":"値","sl3":"項目名","sv3":"値","sl4":"項目名","sv4":"値","sl5":"項目名","sv5":"値","sl6":"項目名","sv6":"値","sl7":"項目名","sv7":"値","sl8":"項目名","sv8":"値","sl9":"項目名","sv9":"値","sl10":"項目名","sv10":"値",
"el1":"指標名","ev1":数値,"el2":"指標名","ev2":数値,"el3":"指標名","ev3":数値,"el4":"指標名","ev4":数値,"el5":"指標名","ev5":数値,"el6":"指標名","ev6":数値,
"yr":年数,"tot":総額整数,"aav":年平均整数,"conf":"高or中or低",
"c1n":"類似選手1","c1y":移籍年,"c1yr":年数,"c1m":2025換算額整数,"c1o":当時の額整数,
"c2n":"類似選手2","c2y":移籍年,"c2yr":年数,"c2m":2025換算額整数,"c2o":当時の額整数,
"comment":"予測根拠1文"
}

投手：勝利数・ERA・WHIP・K/9・FIP・rWAR・BB・奪三振・K/BB・登板数から10項目選んでsl1〜sl10に入れる。
野手：打率・出塁率・長打率・OPS・HR・打点・盗塁・WAR・BB・Kから10項目選んでsl1〜sl10に入れる。
評価スコアは0〜100の整数。
参考相場(2025換算)：山本由伸$350M、田中将大$250M、ダルビッシュ$95M、今永昇太$57M、大谷翔平$750M、吉田正尚$100M、筒香$12M、青木$5M`;

  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

  const callGemini = async (retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 2000,
              responseMimeType: 'application/json',
            },
          }),
        });
        if (response.status === 429) {
          if (attempt < retries) { await new Promise(r => setTimeout(r, 3000 * attempt)); continue; }
          throw new Error('RATE_LIMIT');
        }
        if (!response.ok) {
          const t = await response.text();
          throw new Error(`Gemini API error: ${response.status} - ${t}`);
        }
        const data = await response.json();
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!raw) {
          if (attempt < retries) { await new Promise(r => setTimeout(r, 2000)); continue; }
          throw new Error('EMPTY_RESPONSE');
        }
        const clean = raw.replace(/```json|```/g, '').trim();
        return JSON.parse(clean);
      } catch (err) {
        if (err instanceof SyntaxError && attempt < retries) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        throw err;
      }
    }
  };

  try {
    const result = await callGemini();
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error:', error);
    if (error.message === 'RATE_LIMIT') {
      return res.status(429).json({ error: '⏳ 10秒ほど待ってから再度お試しください。' });
    }
    return res.status(500).json({ error: 'サーバーエラーが発生しました', detail: error.message });
  }
};
