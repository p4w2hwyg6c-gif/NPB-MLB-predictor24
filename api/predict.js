module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { playerName, year } = req.body;
  if (!playerName) return res.status(400).json({ error: '選手名が必要です' });

  const yearContext = year
    ? `「${year}年シーズン終了時点」の成績・年齢で分析。${year}年のシーズン成績とキャリア累計・傾向を考慮すること。`
    : `直近の成績・現在の年齢で分析すること。`;

  const prompt = `あなたはNPB選手のMLB移籍契約を予測する専門アナリストです。

【重要ルール】
1. 「${playerName}」がNPB（日本プロ野球）出身かどうかを必ず確認すること。
2. MLB球団に所属していた、またはMLBでキャリアを積んだ選手は対象外。必ず found: false を返すこと。
3. NPB出身でMLBに移籍した選手、またはNPBに現在所属する選手のみ対象。
4. 類似事例は必ずNPB→MLB移籍のみを挙げること。MLB内の移籍事例は絶対に含めないこと。
5. 契約金はすべて2025年現在の市場価値・インフレ調整済みの金額で表示すること。

「${playerName}」について${yearContext}
投手か野手かを自動判定し、以下のJSONのみで返してください。マークダウン・コードブロック・説明文は一切不要。JSONのみ。

{
  "found": true,
  "name": "正式名",
  "team": "所属球団",
  "age": 年齢(数値),
  "type": "投手" or "野手",
  "position": "ポジション（日本語）",
  "season_year": "${year || '直近'}",
  "stats_main": {
    "wins": "勝利数(投手のみ、野手はnull)",
    "era": "ERA(投手のみ、野手はnull)",
    "games": "登板数(投手のみ、野手はnull)",
    "gs": "先発登板(投手のみ、野手はnull)",
    "ip": "投球回(投手のみ、野手はnull)",
    "er": "自責点(投手のみ、野手はnull)",
    "whip": "WHIP(投手のみ、野手はnull)",
    "goao": "GO/AO(投手のみ、野手はnull)",
    "kper9": "K/9(投手のみ、野手はnull)",
    "war": "rWAR(投手のみ、野手はnull)",
    "bb": "BB(投手のみ、野手はnull)",
    "fip": "FIP(投手のみ、野手はnull)",
    "so": "奪三振数(投手のみ、野手はnull)",
    "kbb": "K/BB(投手のみ、野手はnull)",
    "avg": "打率(野手のみ、投手はnull)",
    "obp": "出塁率(野手のみ、投手はnull)",
    "slg": "長打率(野手のみ、投手はnull)",
    "ops": "OPS(野手のみ、投手はnull)",
    "hr": "HR(野手のみ、投手はnull)",
    "rbi": "打点(野手のみ、投手はnull)",
    "sb": "盗塁(野手のみ、投手はnull)",
    "r": "得点(野手のみ、投手はnull)",
    "h": "安打(野手のみ、投手はnull)",
    "doubles": "二塁打(野手のみ、投手はnull)",
    "triples": "三塁打(野手のみ、投手はnull)",
    "bb_b": "BB(野手のみ、投手はnull)",
    "k_b": "K(野手のみ、投手はnull)",
    "babip": "BABIP(野手のみ、投手はnull)"
  },
  "stats_adv": {
    "xera": "xERA推定(投手のみ)",
    "xba_p": "xBA推定(投手のみ)",
    "fb_velo": "Fastball Velo mph(投手のみ)",
    "chase_p": "Chase%(投手のみ)",
    "whiff_p": "Whiff%(投手のみ)",
    "kpct_p": "K%(投手のみ)",
    "bbpct_p": "BB%(投手のみ)",
    "barrel_p": "被Barrel%(投手のみ)",
    "hardhit_p": "被HardHit%(投手のみ)",
    "gb": "GB%(投手のみ)",
    "extension": "Extension ft(投手のみ)",
    "whip_adv": "WHIP評価(投手のみ)",
    "war_adv_p": "WAR評価(投手のみ)",
    "fip_adv": "FIP評価(投手のみ)",
    "kbb_adv": "K/BB評価(投手のみ)",
    "batting_rv": "Batting Run Value(野手のみ)",
    "baserunning_rv": "Baserunning Run Value(野手のみ)",
    "fielding_rv": "Fielding Run Value(野手のみ)",
    "xwoba": "xwOBA推定(野手のみ)",
    "xba_b": "xBA推定(野手のみ)",
    "xslg": "xSLG推定(野手のみ)",
    "exit_velo": "Avg Exit Velo mph(野手のみ)",
    "barrel_b": "Barrel%(野手のみ)",
    "hardhit_b": "HardHit%(野手のみ)",
    "bat_speed": "Bat Speed mph(野手のみ)",
    "squared_up": "Squared-Up%(野手のみ)",
    "chase_b": "Chase%(野手のみ)",
    "whiff_b": "Whiff%(野手のみ)",
    "kpct_b": "K%(野手のみ)",
    "bbpct_b": "BB%(野手のみ)",
    "oaa": "OAA(野手のみ)",
    "arm_value": "Arm Value(野手のみ)",
    "arm_strength": "Arm Strength mph(野手のみ)",
    "sprint_speed": "Sprint Speed ft/s(野手のみ)",
    "war_b": "WAR(野手のみ)",
    "war_note": "WAR評価(野手のみ)"
  },
  "scores": {
    "score1": 0から100の整数,
    "score2": 0から100の整数,
    "score3": 0から100の整数,
    "score4": 0から100の整数,
    "score5": 0から100の整数,
    "score6": 0から100の整数,
    "score7": 0から100の整数,
    "score8": 0から100の整数,
    "score9": 0から100の整数,
    "score10": 0から100の整数,
    "score11": 0から100の整数,
    "score12": 0から100の整数,
    "labels": ["ラベル1","ラベル2","ラベル3","ラベル4","ラベル5","ラベル6","ラベル7","ラベル8","ラベル9","ラベル10","ラベル11","ラベル12"],
    "descs": ["説明1","説明2","説明3","説明4","説明5","説明6","説明7","説明8","説明9","説明10","説明11","説明12"]
  },
  "predicted_years": 整数,
  "predicted_total_m": 整数,
  "aav_m": 整数,
  "confidence": "高" or "中" or "低",
  "similar_cases": [
    {"name": "NPB出身選手名のみ", "year": 移籍年, "years": 年数, "total_m": 2025年換算額, "original_m": 当時の実際の契約額, "note": "類似ポイント"},
    {"name": "NPB出身選手名のみ", "year": 移籍年, "years": 年数, "total_m": 2025年換算額, "original_m": 当時の実際の契約額, "note": "類似ポイント"},
    {"name": "NPB出身選手名のみ", "year": 移籍年, "years": 年数, "total_m": 2025年換算額, "original_m": 当時の実際の契約額, "note": "類似ポイント"}
  ],
  "comment": "MLB評価と予測根拠を3文（日本語）。2025年市場基準で説明し、主要アドバンスト指標の観点を含めること。"
}

NPB→MLB移籍事例と2025年換算の参考：
山本由伸(2023)$325M→$350M、今永昇太(2023)$53M→$57M、菊池雄星(2022)$56M→$63M、
吉田正尚(2022)$90M→$100M、ダルビッシュ(2011)$56M→$95M、田中将大(2013)$155M→$250M、
前田健太(2015)$25M→$38M、大谷翔平(2023)$700M→$750M、筒香(2019)$9M→$12M、
秋山(2019)$6.5M→$9M、青木(2011)$3M→$5M、福留(2007)$48M→$90M

選手がNPB出身でない・存在しない場合は {"found": false} のみ返すこと。`;

  try {
    // Gemini API呼び出し
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 3000,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'サーバーエラーが発生しました', detail: error.message });
  }
};
