# Team photos from the old site

The previous site (iwmresearch.net, Wix) still serves the lab's own headshots.
These are the lab's images, so there is no third-party rights problem in reusing
them — unlike anything scraped from elsewhere on the web.

**Check each one before uploading.** The name-to-image pairing below was derived
from how close each image sits to each name in the page's HTML, not from any
label on the image. The spacing was consistent (~1,000 characters for every
entry), so it is probably right, but a wrong pairing puts the wrong face on the
wrong person — worth thirty seconds of eyeballing.

Append `/v1/fill/w_800,h_1000,al_c,q_85/img.jpg` to any URL for a cropped,
portrait-shaped version suited to the team card's 4:5 frame. Without it you get
the original upload.

## Have a photo

| Person | Image |
|---|---|
| Gordon Price | `2faf8d_0c254c8e277a4e54b0cb534cd37f20a7~mv2.jpg` |
| Weixi Shu | `2faf8d_02c1b05bcab74860b99152b1f4c612a8~mv2.jpg` |
| Behnam Asgari Lajayer | `2faf8d_f5789199e6854ac2897926e52c7f5b00~mv2.jpg` |
| Gayathri Remani Sudarsanan Pillai | `2faf8d_472f342eb5264efa986d4c25f5d09771~mv2.jpg` |
| Zheya Lin | `2faf8d_5ccf69b3d0fc450887f95b59070a9fc3~mv2.jpg` |
| Mandi Wilson | `2faf8d_637959ddb9174062bba68b5d765964ba~mv2.jpg` |
| Lina Maria Gomez Cortes | `2faf8d_b3b87b4522e442998e87022e8ed3bdfd~mv2.jpg` |
| Alejandro Quezada | `2faf8d_a3bbfc1156ea423884f91d1b63d60331~mv2.jpeg` |
| Stuart Downie | `2faf8d_811e1125290240a3a82b986810744cb3~mv2.jpg` |
| Charlie Little | `2faf8d_ec6b65749bea42f8af38e5c137a16788~mv2.jpg` |
| Allan Thomson | `2faf8d_cbdee1201697481bba0b2596a0110c52~mv2.jpg` |
| Ryan Bell | `2faf8d_e3b80b7c1b034aa98cb18d1be4b2ed47~mv2.jpg` |
| Jessie Davidson | `2faf8d_416fde4e4f8d4e6abbda474b63cd5b51~mv2.jpg` |
| Emmanuel Tsimanga | `2faf8d_d2cca7e4e6cb49ddac3fb61b1f51a7c0~mv2.jpg` |
| Matthew McLaughlin | `2faf8d_f1cb731fa460431ab1090fa46eabb831~mv2.png` |
| Emily Gowan | `2faf8d_56f66ae9c8f04abd8c61fd4b489566d6~mv2.jpg` |
| Anjie Luo | `2faf8d_2299888085f546599a8b1396ad76e817~mv2.jpg` |
| Qianhan Le | `2faf8d_b022019c338e4850b2a51817304398a7~mv2.jpg` |
| Charlie Parent | `2faf8d_b7cff05f8742453bb51c31e0c9f57902~mv2.jpg` |

Full URL: `https://static.wixstatic.com/media/<filename>`

## No photo on the old site

These four resolve to `2faf8d_d1e6b70b50184e78a79f445d6f637b95~mv2.jpg`, which is
the IWM logo used as a stand-in — not a headshot:

- Alexis De Laronde
- Mina Mehnati
- Xiaowen Ni
- Nandhini Krishnamoorthy

The team card already falls back to a neutral placeholder icon when
`image_path` is empty, so leaving these blank looks deliberate rather than
broken.

## Uploading

Photos go through the admin (Team → edit a person → Upload photo), which
presigns to S3 and stores the resulting URL. There is no bulk path for images —
`import_content.py` deliberately posts `image_path: ""` so a re-run never wipes
a photo somebody uploaded by hand.
