import schnorr.schnorr_lib as sl


message = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
pub_key_x = "0x17cbd3ed3151ccfd170efe1d54280a6a4822640bf5c369908ad74ea21518a9c5"
pub_key_y = "0x0e0456e3795c1a31f20035b741cd6158929eeccd320d299cfcac962865a6bc74"
signature = [
    5,
    202,
    31,
    146,
    81,
    242,
    246,
    69,
    43,
    107,
    249,
    153,
    198,
    44,
    14,
    111,
    191,
    121,
    137,
    166,
    160,
    103,
    18,
    181,
    243,
    233,
    226,
    95,
    67,
    16,
    37,
    128,
    85,
    76,
    19,
    253,
    30,
    77,
    192,
    53,
    138,
    205,
    69,
    33,
    236,
    163,
    83,
    194,
    84,
    137,
    184,
    221,
    176,
    121,
    179,
    27,
    63,
    70,
    54,
    16,
    176,
    250,
    39,
    239,
]


message_hash = sl.sha256(message.encode())

pubkey_bytes = bytes.fromhex(pub_key_x[2:])

sig_bytes = bytes(signature)

result = sl.schnorr_verify(message_hash, pubkey_bytes, sig_bytes)

if result:
    print("The signature is VALID for this message and this public key")
else:
    print("The signature is NOT VALID for this message and this public key")
