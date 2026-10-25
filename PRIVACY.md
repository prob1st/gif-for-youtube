# Gizlilik Politikası — GIF for YouTube (GIF Studio)

Son güncelleme: 25 Ekim 2026 · Sürüm 1.1.0

## Özet
Uzantı **hiçbir kişisel veri toplamaz, satmaz veya paylaşmaz**. Analitik, izleme, reklam ve uzak sunucu yoktur.
Tüm veriler yalnızca senin tarayıcında (`chrome.storage.local`) tutulur.

## İşlenen veriler
| Veri | Nerede | Süre |
|---|---|---|
| Ayarlar (tema, dil, stil, ekleme modu) | `chrome.storage.local` | Sen silene kadar |
| Favoriler, son kullanılanlar, özel tepkiler | `chrome.storage.local` | Sen silene kadar |
| Giphy API anahtarı (isteğe bağlı) | `chrome.storage.local` | Sen silene kadar |
| Yerel GIF dosyaları (eklersen) | base64 olarak tarayıcıda | Sen silene kadar |

Hiçbir veri bir sunucuya gönderilmez; uzantının kendi sunucusu yoktur.

## Yorumları okuma (v1.1.0)
“Yorumlarda GIF kodlarını göster” açıkken (varsayılan) uzantı, sayfada görünen yorumların metnini
yalnızca `:gfy:<id>:` kalıbını aramak için tarar. Bu tarama **cihazında** yapılır; yorum metinleri
hiçbir yere gönderilmez, saklanmaz veya kaydedilmez. Özelliği ayarlardan kapatabilirsin.

## Üçüncü taraf istekleri
- **Arama**: girdiğin arama terimi doğrudan Giphy'ye (`giphy.com` / `api.giphy.com`) iletilir.
- **GIF medyası**: GIF'ler Giphy CDN'inden (`media*.giphy.com`) yüklenir.
- **Link çözümleme**: yapıştırdığın Giphy/Tenor linki, GIF adresini bulmak için ilgili siteye sorgulanır.

Bu istekler yalnızca senin eylemlerinle tetiklenir. Giphy'nin gizlilik politikası: https://giphy.com/privacy

## İzinler ve gerekçeleri
| İzin | Neden |
|---|---|
| `storage` | Ayarlar ve favorileri cihazda saklamak |
| `scripting`, `activeTab` | Panelin yüklenemediği durumda içerik betiğini çalıştırmak |
| `clipboardWrite` | GIF'i panoya kopyalamak |
| `contextMenus` | Sağ tık menüsünden GIF eklemek |
| Host: `*.youtube.com` | Yorum alanına GIF eklemek |
| Host: giphy/tenor alan adları | GIF aramak ve medyayı göstermek |

`<all_urls>` **istenmez**; uzantı diğer sitelerde çalışmaz.

## Kullanıcı kontrolü
Ayarlar sayfasından (`Ayarlar → Veriler`) tüm verileri tek tıkla silebilir, dışa/içe aktarabilirsin.
Uzantıyı kaldırdığında Chrome ilgili depolamayı siler.

## Çocuklar
Uzantı 13 yaş altı kullanıcılardan bilerek veri toplamaz (zaten hiç veri toplamaz). "Güvenli arama" varsayılan açıktır.

## İletişim
Sorular için: uzantı deposundaki issue kanalı.

## Değişiklikler
Politika değişirse bu dosya güncellenir ve sürüm numarası artırılır.
