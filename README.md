# Envantra

Diler Holding için çok lokasyonlu BT varlık, ağ altyapısı, personel, telefon kullanıcısı ve zimmet yönetim uygulaması. Arayüz Türkçedir; kontrol veritabanı ve her lokasyona ait bağımsız PostgreSQL veritabanları kesin olarak ayrılmıştır.

## Hızlı başlangıç

Gereksinimler: Docker Desktop ve Docker Compose v2.

```bash
docker compose up --build
```

Uygulama container'ı ilk açılışta migration ve idempotent seed işlemlerini otomatik uygular. Uygulama `http://localhost:3000` adresindedir. Geliştirme kullanıcısı `admin`, ilk parolası `Envantra!2026` şeklindedir. İlk girişten sonra parolayı değiştirin. Host üzerinden geliştirme LDAP adresi `ldap://127.0.0.1:1389` olur. LDAP bağlantısını ayrıca doğrulamak için `docker compose exec app pnpm ad:bootstrap` kullanılabilir.

## Mimari

- **Kontrol DB:** Kullanıcılar, rol/kapsamlar, fiziksel hiyerarşi, şirketler, kategoriler, AD profilleri/eşleştirmeleri, bağlantı bilgileri, sağlık ve merkezi audit.
- **Lokasyon DB'leri:** Varlıklar ve tür detayları, ağ bilgileri, bağlantılar, zimmetler, telefon kullanıcıları, hareketler ve lokasyon audit kayıtları.
- **Bağlantı izolasyonu:** Her lokasyon için ayrı `pg.Pool` vardır. Havuzlar süreç boyunca yeniden kullanılır. Art arda üç hata circuit breaker'ı açar; varsayılan 30 saniye sonra yarı açık deneme yapılır. Çoklu lokasyon sağlık sorguları `Promise.allSettled` kullanır. Bir hata diğer lokasyonların sonucunu bozmaz ve ilgili API `SITE_DATABASE_UNAVAILABLE` koduyla 503 döner.
- **Yetki:** `ADMIN`, `IT_OPERATOR`, `VIEWER`, `AUDITOR` rolleri ile `GLOBAL`, `PROVINCE`, `SITE` kapsamları sunucu tarafında uygulanır. API, istemcinin gönderdiği `siteId` değerini kontrol DB'deki kullanıcı kapsamıyla doğrulamadan lokasyon DB'ye bağlanmaz.

Geliştirmede iki PostgreSQL container'ı içinde her lokasyon için ayrı veritabanı açılır. `site_connections.encrypted_url` her lokasyonun kendi adresini taşır; üretimde bu adresler farklı sunucuları gösterebilir. Üretimde URL değerlerini bir secret manager veya uygulama-seviyesi şifrelemeyle sağlayın; `plain:` yalnızca geliştirme seed'i içindir.

## Migration ve seed

`pnpm db:migrate` önce kontrol migration'ını, sonra tüm lokasyon migration'larını birbirinden bağımsız çalıştırır. Bir lokasyonun migration hatası diğerlerini geri almaz; lokasyonlar arası transaction yoktur. `pnpm db:seed` il/lokasyonları, sahip şirketleri, ofis/ağ kategorilerini, kategori kodlarını ve geliştirme yöneticisini idempotent biçimde ekler.

Yeni Drizzle migration'ı üretmek için:

```bash
pnpm db:generate
```

## Ağ cihazı numaralandırması

Format `{IL}-{LOKASYON}-{KABIN}-{TUR}-{SIRA}` şeklindedir. `asset_code_sequences` tablosundaki `(site_id, rack_id, category_id)` birincil anahtarı ile tek bir atomik `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` sorgusu kullanılır. Böylece eşzamanlı kayıtlarda aynı sıra üretilemez. `assets.asset_code` ayrıca benzersizdir. Kabin değişiminde yeni kod ayrılır; önceki/yeni kod `asset_movements` kaydında tutulurken varlığın UUID'si değişmez. UUID ve varlık kodu QR/barkod etiketi üretmek için kararlı kaynaklardır.

## Zimmet ve telefon bütünlüğü

- `assignments_one_active_per_asset`: Bir varlığa yalnızca bir aktif zimmet.
- `phone_users_one_active_primary_per_asset`: Bir telefona yalnızca bir aktif ana kullanıcı.
- İade ve kullanıcı değişimleri eski satırı silmez; durumu/bitiş tarihi kapatır ve olay geçmişi ekler.
- Ortak telefonlarda profil yerine oda seçilir; veritabanı kontrolü ikisinden tam olarak birini zorunlu kılar.

## AD senkronizasyonu

`POST /api/ad/sync`, yalnızca yönetici veya BT operatörü tarafından çağrılabilir. LDAP'den yalnızca kullanıcı ve bilgisayar nesneleri alınır. `objectGUID` idempotent anahtardır. Kullanıcılar erişim hesabına dönüştürülmez. Bilgisayarlar eşleşen OU'nun lokasyon DB'sinde `DRAFT` masaüstü kaydı olur. Eşleşmeyen OU kayıtları sayaçta tutulur. Mevcut varlıkların elle girilen marka, model, konum ve açıklama alanları ezilmez; yalnızca AD'ye ait alanlar güncellenir. Tek nesne hatası döngüyü durdurmaz. Devre dışı kullanıcılar silinmez, pasife alınır.

Geliştirme AD servisi yalnızca LDAP dizini olarak kullanılır; Kerberos, Windows DNS, Group Policy veya domain join kapsam dışıdır.

## API hata biçimi

```json
{"ok":false,"error":{"code":"SITE_DATABASE_UNAVAILABLE","message":"Lokasyon veritabanına erişilemiyor."}}
```

Hassas bağlantı/parola değerleri istemciye veya loglara yazılmaz. Beklenmeyen hatalarda yalnızca güvenli hata mesajı döner.

Lokasyon bağlantı adresleri `SITE_DB_ENCRYPTION_KEY` ile AES-256-GCM kullanılarak şifrelenir. Anahtar 32 rastgele baytın base64 gösterimi olmalıdır:

```bash
openssl rand -base64 32
```

`.env.example` yalnızca geliştirme anahtarı içerir; üretimde mutlaka farklı bir secret manager değeri kullanılmalıdır. Üretim modu düz metin `plain:` bağlantılarını reddeder. Giriş işlemi IP ve kullanıcı adı bileşimi başına 15 dakikada beş başarısız denemeyle sınırlandırılır. Reverse proxy, istemciden gelen sahte `X-Forwarded-For` değerlerini temizleyip kendi güvenilir değerini yazmalıdır.

## Uygulama işlevleri

Dashboard seçili lokasyonun gerçek varlık verilerini lokasyon veritabanından okur. Menüde varlıklar, kullanıcı/ofis cihazları, ağ cihazları, personel, aktif zimmetler, telefon kullanıcıları, kabinler, veritabanı sağlığı, audit kayıtları ve kategoriler ayrı görünümler olarak yüklenir. Yeni varlık formu kategoriye göre bilgisayar, mobil, yazıcı ve ağ alanlarını dinamik açar. Zimmet ve telefon kullanıcı atamaları arayüzden oluşturulur; çakışmalar veritabanı kuralı ve standart `CONFLICT` API yanıtıyla engellenir.

Temel uçlar:

- `POST /api/assets`: Kategoriye özgü detaylarıyla varlık oluşturur.
- `GET|PATCH /api/assets/:id`: Varlık detayı, kategori detayı, hareket geçmişi ve düzenleme.
- `GET|POST|DELETE /api/assets/:id/relations`: Fiziksel ve mantıksal cihaz bağlantıları.
- `GET|POST /api/assignments`, `POST /api/assignments/:id/return`: Aktif zimmet ve iade akışı.
- `GET|POST /api/phone-users`, `POST /api/phone-users/:id/close`: Telefon kullanıcı geçmişi.
- `GET /api/personnel`: AD personel profilleri.
- `GET|POST|PATCH /api/admin/locations`: İl, lokasyon, bina, kat, oda ve kabin yönetimi.
- `GET|POST /api/admin/categories`, `PATCH /api/admin/categories/:id`: Dinamik kategori yönetimi.
- `GET|POST /api/admin/users`, `PATCH /api/admin/users/:id`: AD profilinden erişim hesabı oluşturma, rol ve kapsam yönetimi.
- `GET /api/health/sites`: İzole lokasyon sağlık kontrolleri.
- `POST /api/ad/sync`: İdempotent AD senkronizasyonu.
- `GET|POST /api/ad/unmatched`: Eşleştirilemeyen AD bilgisayarları ve OU–lokasyon eşleştirmesi.
- `GET|POST /api/admin/companies`, `PATCH /api/admin/companies/:id`: Fiziksel lokasyondan bağımsız sahip şirket yönetimi.

Varlık listelerinde istemci tarafı arama ve UTF-8 BOM içeren, Türkçe Excel kurulumlarıyla uyumlu noktalı virgül ayrımlı CSV dışa aktarma bulunur. Varlık detayında ilişkiler iki yönde ve kod değişiklikleri hareket geçmişi olarak gösterilir. Ağ cihazı başka kabine taşındığında atomik sayaçtan yeni kod ayrılır; önceki kod silinmez.

Liste görünümleri 20 kayıtlık sayfalar halinde sunulur. Yönetim panelinden yeni kategori, il, lokasyon, bina, kat, oda ve kabin eklenebilir. Bir AD personeli uygulama kullanıcısına dönüştürülürken rol ve `GLOBAL`, `PROVINCE` veya `SITE` kapsamı ayrıca atanır; AD profili tek başına erişim sağlamaz.

OU eşleştirmesi bulunmayan AD bilgisayarları `unmatched_ad_records` tablosunda neden ve görülme tarihleriyle tutulur. Yönetici/BT operatörü bu kaydı bir lokasyona bağladığında OU eşlemesi oluşturulur; sonraki senkronizasyon bilgisayarı ilgili lokasyon veritabanında taslak varlığa dönüştürür. Sağlık sorguları son başarılı ve başarısız bağlantı zamanlarını, gecikmeyi ve hata kodunu `site_connections` üzerinde kalıcılaştırır.

## Testler

```bash
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Hata izolasyonu testi için örneğin `docker compose stop site-db-1` çalıştırıp sağlık API'sinde bu sunucudaki lokasyonların çevrimdışı, `site-db-2` lokasyonlarının çalışır kaldığını doğrulayın; ardından `docker compose start site-db-1` ile geri açın. Veritabanı kısmi benzersiz indeksleri çift zimmet ve çift aktif telefon kullanıcısını, atomik sayaç ise eşzamanlı ağ kodu çakışmasını engeller.

## Dizinler

- `app/`: Next.js App Router sayfaları ve API route'ları
- `src/db/`: Kontrol/lokasyon şemaları ve havuz yöneticisi
- `src/auth/`: JWT oturumu, rol ve kapsam doğrulaması
- `src/services/`: AD senkronizasyonu ve varlık kodu üretimi
- `drizzle/`: Kontrol ve lokasyon migration'ları
- `scripts/`: Migration, seed ve AD bağlantı hazırlığı
- `tests/`, `e2e/`: Birim ve tarayıcı testleri
