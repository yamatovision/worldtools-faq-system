#!/usr/bin/env python3
"""
巴商会 テスト用PDF生成スクリプト
RAGテスト用に固有情報を含むドキュメントを生成
"""

from fpdf import FPDF
import os

# 出力ディレクトリ
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

class JapanesePDF(FPDF):
    def __init__(self):
        super().__init__()
        # 日本語フォントを追加（Noto Sans JPを使用）
        self.add_font('NotoSansJP', '', '/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc', uni=True)
        self.set_font('NotoSansJP', '', 11)

    def header(self):
        self.set_font('NotoSansJP', '', 9)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, '株式会社巴商会 社内規定文書', align='R', new_x="LMARGIN", new_y="NEXT")
        self.ln(5)

    def chapter_title(self, title):
        self.set_font('NotoSansJP', '', 16)
        self.set_text_color(10, 133, 188)  # 巴商会ブランドカラー
        self.cell(0, 15, title, new_x="LMARGIN", new_y="NEXT")
        self.ln(5)
        self.set_text_color(0, 0, 0)
        self.set_font('NotoSansJP', '', 11)

    def section_title(self, title):
        self.set_font('NotoSansJP', '', 13)
        self.set_text_color(60, 60, 60)
        self.cell(0, 10, title, new_x="LMARGIN", new_y="NEXT")
        self.set_font('NotoSansJP', '', 11)
        self.set_text_color(0, 0, 0)

    def body_text(self, text):
        self.multi_cell(0, 7, text)
        self.ln(3)


def create_nursing_care_leave_pdf():
    """介護休業規定 - 固有情報を含む"""
    pdf = JapanesePDF()
    pdf.add_page()

    pdf.chapter_title('介護休業規定')

    pdf.body_text('制定日：2024年9月1日')
    pdf.body_text('最終改定日：2025年1月15日（法改正対応）')
    pdf.body_text('文書番号：HR-CARE-2025-001')
    pdf.ln(5)

    pdf.section_title('第1条（目的）')
    pdf.body_text(
        '本規定は、株式会社巴商会（以下「会社」という）の従業員が家族の介護を行うために'
        '必要な休業等について定めることを目的とする。'
    )

    pdf.section_title('第2条（対象者）')
    pdf.body_text(
        '介護休業を取得できる従業員は、入社後1年以上経過した者とする。'
        'ただし、2025年4月1日以降は、入社後6ヶ月以上経過した者も対象とする。'
    )

    pdf.section_title('第3条（介護休業の期間）')
    pdf.body_text(
        '【重要：2025年法改正対応】\n'
        '介護休業の通算取得可能日数は、対象家族1人につき最大93日とする。\n'
        '当社独自制度として、追加で30日の「巴商会介護サポート休暇」を付与する。\n'
        '合計123日まで取得可能（業界最高水準）。'
    )

    pdf.section_title('第4条（申請手続き）')
    pdf.body_text(
        '介護休業を希望する従業員は、休業開始予定日の2週間前までに、'
        '人事システム「TOMOE-HR」より申請を行うこと。\n\n'
        '【申請コード】\n'
        '・介護休業（法定）：CARE-001\n'
        '・巴商会介護サポート休暇：CARE-002\n'
        '・介護短時間勤務：CARE-003'
    )

    pdf.section_title('第5条（給与の取り扱い）')
    pdf.body_text(
        '介護休業期間中の給与は以下の通りとする。\n\n'
        '・法定介護休業（93日まで）：無給（雇用保険より給付金支給）\n'
        '・巴商会介護サポート休暇（30日）：基本給の60%を支給\n\n'
        '【重要】介護休業給付金の申請は、人事部介護支援担当（内線：7834）まで。'
    )

    pdf.section_title('第6条（問い合わせ先）')
    pdf.body_text(
        '介護休業に関する問い合わせは以下まで。\n\n'
        '・人事部 介護支援チーム\n'
        '・内線番号：7834\n'
        '・メール：kaigo-support@tomoe-shokai.co.jp\n'
        '・受付時間：平日9:00〜17:00'
    )

    pdf.output(os.path.join(OUTPUT_DIR, '介護休業規定_2025年版.pdf'))
    print('✅ 介護休業規定_2025年版.pdf を生成しました')


def create_expense_guideline_pdf():
    """経費精算ガイドライン - 固有情報を含む"""
    pdf = JapanesePDF()
    pdf.add_page()

    pdf.chapter_title('経費精算ガイドライン')

    pdf.body_text('制定日：2024年9月1日（新基幹システム導入に伴う改定）')
    pdf.body_text('文書番号：FIN-EXP-2024-003')
    pdf.ln(5)

    pdf.section_title('1. 経費精算システムについて')
    pdf.body_text(
        '2024年9月より、経費精算は新システム「TOMOE-KEIRI」を使用する。\n'
        '旧システム（Excel申請）は2024年12月末で完全廃止。'
    )

    pdf.section_title('2. 経費区分コード一覧')
    pdf.body_text(
        '【交通費】\n'
        '・EXP-T01：電車・バス（定期区間外）\n'
        '・EXP-T02：タクシー（要事前承認）\n'
        '・EXP-T03：新幹線・特急\n'
        '・EXP-T04：航空機（国内）\n'
        '・EXP-T05：航空機（海外）\n\n'
        '【宿泊費】\n'
        '・EXP-H01：国内宿泊（上限12,000円/泊）\n'
        '・EXP-H02：海外宿泊（上限20,000円/泊）\n\n'
        '【接待交際費】\n'
        '・EXP-E01：社外接待（上限10,000円/人）\n'
        '・EXP-E02：社内懇親会（上限5,000円/人）'
    )

    pdf.section_title('3. 承認フロー')
    pdf.body_text(
        '経費金額に応じた承認フローは以下の通り。\n\n'
        '・10,000円未満：直属上長のみ\n'
        '・10,000円〜50,000円：直属上長 → 部長\n'
        '・50,000円〜100,000円：直属上長 → 部長 → 経理部長\n'
        '・100,000円以上：直属上長 → 部長 → 経理部長 → 常務取締役\n\n'
        '【特例】タクシー利用は金額に関わらず部長承認が必要。'
    )

    pdf.section_title('4. 精算締め日と支払日')
    pdf.body_text(
        '・申請締め日：毎月25日 17:00まで\n'
        '・承認締め日：毎月末日\n'
        '・支払日：翌月15日（給与振込と同時）\n\n'
        '【注意】25日を過ぎた申請は翌月扱いとなります。'
    )

    pdf.section_title('5. 領収書の取り扱い')
    pdf.body_text(
        '・3,000円以上の経費は必ず領収書を添付すること\n'
        '・電子領収書はPDF形式でシステムにアップロード\n'
        '・紙の領収書は経理部へ提出（社内便コード：KEIRI-001）\n'
        '・領収書の保管期間：7年間'
    )

    pdf.section_title('6. 問い合わせ先')
    pdf.body_text(
        '経費精算に関する問い合わせは以下まで。\n\n'
        '・経理部 経費精算チーム\n'
        '・内線番号：6521\n'
        '・メール：keihi@tomoe-shokai.co.jp\n'
        '・対応時間：平日9:00〜18:00（12:00〜13:00除く）'
    )

    pdf.output(os.path.join(OUTPUT_DIR, '経費精算ガイドライン.pdf'))
    print('✅ 経費精算ガイドライン.pdf を生成しました')


def create_hr_system_manual_pdf():
    """人事システム操作マニュアル - 固有情報を含む"""
    pdf = JapanesePDF()
    pdf.add_page()

    pdf.chapter_title('人事システム TOMOE-HR 操作マニュアル')

    pdf.body_text('バージョン：2.1.0')
    pdf.body_text('最終更新日：2025年1月10日')
    pdf.body_text('文書番号：SYS-HR-MANUAL-001')
    pdf.ln(5)

    pdf.section_title('1. システム概要')
    pdf.body_text(
        'TOMOE-HRは、2024年9月に導入された当社の人事管理システムです。\n'
        '勤怠管理、休暇申請、各種届出をオンラインで行えます。\n\n'
        '【アクセス方法】\n'
        '・社内：https://hr.tomoe-shokai.co.jp\n'
        '・社外：VPN接続後、Okta認証でログイン'
    )

    pdf.section_title('2. ログイン方法')
    pdf.body_text(
        '① Oktaポータル（https://tomoe.okta.com）にアクセス\n'
        '② 社員番号@tomoe-shokai.co.jp でログイン\n'
        '③ 二要素認証（Okta Verify）を完了\n'
        '④ アプリ一覧から「TOMOE-HR」をクリック\n\n'
        '【トラブル時】\n'
        '・パスワードリセット：Oktaポータルの「パスワードを忘れた」から\n'
        '・ロックアウト：情報システム部（内線：8001）へ連絡'
    )

    pdf.section_title('3. 有給休暇申請')
    pdf.body_text(
        '【申請手順】\n'
        '① メニュー「休暇申請」→「有給休暇」を選択\n'
        '② 取得日を選択（半日単位可能）\n'
        '③ 理由を選択（プライベート/通院/その他）\n'
        '④ 「申請」ボタンをクリック\n\n'
        '【承認フロー】\n'
        '申請者 → 直属上長 → 承認完了（自動で勤怠反映）\n\n'
        '【申請期限】\n'
        '・原則：取得日の3営業日前まで\n'
        '・緊急時：当日9:00までに電話連絡の上、事後申請可\n\n'
        '【有給残日数確認】\n'
        'メニュー「マイページ」→「休暇残日数」で確認可能'
    )

    pdf.section_title('4. 勤怠修正')
    pdf.body_text(
        '打刻忘れや修正が必要な場合の手順。\n\n'
        '① メニュー「勤怠管理」→「勤怠修正申請」\n'
        '② 対象日を選択\n'
        '③ 修正内容を入力（出勤時刻/退勤時刻/休憩時間）\n'
        '④ 修正理由を入力（必須）\n'
        '⑤ 「申請」ボタンをクリック\n\n'
        '【注意】\n'
        '・月末締め後の修正は経理部長承認が追加で必要\n'
        '・修正申請コード：ATT-FIX-001'
    )

    pdf.section_title('5. よくあるエラーと対処法')
    pdf.body_text(
        '【ERR-001】ログインできない\n'
        '→ Oktaポータルでパスワードリセットを実行\n\n'
        '【ERR-002】申請ボタンが押せない\n'
        '→ 必須項目が未入力。赤枠の項目を確認\n\n'
        '【ERR-003】承認者が表示されない\n'
        '→ 組織マスタ未更新の可能性。人事部（内線：7001）へ連絡\n\n'
        '【ERR-004】二要素認証が届かない\n'
        '→ Okta Verifyアプリを再インストール'
    )

    pdf.section_title('6. サポート窓口')
    pdf.body_text(
        '【システム操作について】\n'
        '・人事部 システムサポート\n'
        '・内線：7001\n'
        '・メール：hr-support@tomoe-shokai.co.jp\n\n'
        '【ログイン・認証トラブル】\n'
        '・情報システム部 ヘルプデスク\n'
        '・内線：8001\n'
        '・メール：helpdesk@tomoe-shokai.co.jp\n\n'
        '【受付時間】平日8:30〜18:00'
    )

    pdf.output(os.path.join(OUTPUT_DIR, '人事システム操作マニュアル.pdf'))
    print('✅ 人事システム操作マニュアル.pdf を生成しました')


if __name__ == '__main__':
    print('📄 巴商会テスト用PDFを生成中...\n')
    create_nursing_care_leave_pdf()
    create_expense_guideline_pdf()
    create_hr_system_manual_pdf()
    print(f'\n✨ 完了！生成先: {OUTPUT_DIR}')
