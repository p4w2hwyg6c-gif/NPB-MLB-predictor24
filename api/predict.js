
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { playerName, year } = req.body;
  if (!playerName) return res.status(400).json({ error: '選手名が必要です' });

  const prompt = `NPB（日本プロ野球）選手「${playerName}」のMLB移籍契約を予測してください。
${year ? `${year}年シーズン終了時点の成績・年齢で分析。` : '直近の成績で分析。'}

ルール：
- NPB出身でない、またはMLB所属選手なら {"found": false} のみ返す
- 成績が良くなくてもNPB選手なら必ずfound: trueで返すこと
- 契約金は2025年の市場価値に換算
- 出力はJSONのみ。説明文・コードブロック記号なし
- 各項目は短く端的に。長文禁止

出力形式（必ずこの構造を守ること）：

{
  "found": true,
  "name": "選手名",
  "team": "球団名",
  "age": 年齢の数値,
  "type": "投手または野手",
  "position": "ポジション",
  "stats": {
    "stat1_label": "項目名1", "stat1_value": "値1",
    "stat2_label": "項目名2", "stat2_value": "値2",
    "stat3_label": "項目名3", "stat3_value": "値3",
    "stat4_label": "項目名4", "stat4_value": "値4",
    "stat5_label": "項目名5", "stat5_value": "値5",
    "stat6_label": "項目名6", "stat6_value": "値6"
  },
  "scores": {
    "score1": 数値, "score2": 数値, "score3": 数値, "score4": 数値,
    "label1": "指標名1", "label2": "指標名2", "label3": "指標名3", "label4": "指標名4"
  },
  "predicted_years": 整数,
  "predicted_total_m": 整数,
  "aav_m": 整数,
  "confidence": "高または中または低",
  "similar_case_name": "類似する移籍選手名1人",
  "similar_case_amount": 整数,
  "comment": "予測根拠を1文で"
}

投手ならERA・WHIP・K/9・FIP・rWAR・勝利数、野手なら打率・OPS・HR・打点・WAR・守備指標から重要な6項目を選ぶこと。
参考相場（2025年換算）：山本由伸$350M、田中将大$250M、ダルビッシュ$95M、菊池雄星$63M、今永昇太$57M、前田健太$38M、大谷翔平$750M、吉田正尚$100M、筒香$12M、青木$5M`;

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
          if (attempt < retries) {
            await new Promise(r => setTimeout(r, 3000 * attempt));
            continue;
          }
          throw new Error('RATE_LIMIT');
        }

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Gemini API error: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (!raw) {
          if (attempt < retries) {
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }
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
      return res.status(429).json({ error: '⏳ アクセスが集中しています。10秒ほど待ってから再度お試しください。' });
    }
    return res.status(500).json({ error: 'サーバーエラーが発生しました', detail: error.message });
  }
};
