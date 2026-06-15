/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/vow.json`.
 */
export type Vow = {
  "address": "7ytRMwKykiJnbT3gdLXPCUZMzrTNZZbr7m2i7fwiyjbJ",
  "metadata": {
    "name": "vow",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "VOW Protocol — Soulbound identity, session keys, and stake-backed credentials on X1 Network"
  },
  "instructions": [
    {
      "name": "activateStake",
      "discriminator": [
        162,
        155,
        148,
        121,
        91,
        65,
        2,
        96
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "vowState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "vow_state.asset_id",
                "account": "vowState"
              }
            ]
          }
        },
        {
          "name": "reserve",
          "docs": [
            "Reserve PDA — receives the new stake deposit"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "vowState"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "stakeLamports",
          "type": "u64"
        },
        {
          "name": "yieldMode",
          "type": {
            "defined": {
              "name": "yieldMode"
            }
          }
        }
      ]
    },
    {
      "name": "addStake",
      "discriminator": [
        58,
        135,
        189,
        105,
        160,
        120,
        165,
        224
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "vowState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "vow_state.asset_id",
                "account": "vowState"
              }
            ]
          }
        },
        {
          "name": "reserve",
          "docs": [
            "Reserve PDA — receives the additional staked lamports"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "vowState"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "lamportsToAdd",
          "type": "u64"
        }
      ]
    },
    {
      "name": "beginUnstake",
      "discriminator": [
        156,
        67,
        177,
        83,
        28,
        111,
        174,
        132
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "vowState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "vow_state.asset_id",
                "account": "vowState"
              }
            ]
          }
        },
        {
          "name": "unstakeEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  110,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "vowState"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "vowState"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "blockApp",
      "discriminator": [
        192,
        82,
        175,
        217,
        236,
        13,
        65,
        104
      ],
      "accounts": [
        {
          "name": "appRegistry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  112,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "app_registry.program_id",
                "account": "appRegistry"
              }
            ]
          }
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "closeAuthorityProfile",
      "discriminator": [
        56,
        241,
        221,
        157,
        211,
        240,
        14,
        232
      ],
      "accounts": [
        {
          "name": "authorityProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                  95,
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "wallet"
              },
              {
                "kind": "account",
                "path": "authority_profile.profile_id",
                "account": "authorityProfile"
              }
            ]
          }
        },
        {
          "name": "wallet",
          "writable": true,
          "signer": true,
          "relations": [
            "authorityProfile"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "closeProtocolConfig",
      "discriminator": [
        203,
        147,
        4,
        67,
        17,
        28,
        203,
        219
      ],
      "accounts": [
        {
          "name": "config",
          "docs": [
            "close a config account whose layout has changed across a program upgrade."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "closeSession",
      "discriminator": [
        68,
        114,
        178,
        140,
        222,
        38,
        248,
        211
      ],
      "accounts": [
        {
          "name": "vowState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "vow_state.asset_id",
                "account": "vowState"
              }
            ]
          },
          "relations": [
            "sessionAccount"
          ]
        },
        {
          "name": "sessionAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "vowState"
              },
              {
                "kind": "account",
                "path": "session_account.session_index",
                "account": "sessionAccount"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "vowState"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "completeUnstake",
      "discriminator": [
        79,
        98,
        40,
        241,
        100,
        30,
        25,
        234
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "vowState",
          "docs": [
            "VOW state is NOT closed — it persists as a permanent identity credential."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "vow_state.asset_id",
                "account": "vowState"
              }
            ]
          }
        },
        {
          "name": "unstakeEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  110,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "vowState"
              }
            ]
          }
        },
        {
          "name": "reserve",
          "docs": [
            "Reserve PDA — source of withdrawal lamports"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "vowState",
            "unstakeEscrow"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "createAuthorityProfile",
      "discriminator": [
        144,
        41,
        68,
        69,
        166,
        81,
        49,
        175
      ],
      "accounts": [
        {
          "name": "authorityProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                  95,
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "wallet"
              },
              {
                "kind": "arg",
                "path": "profileId"
              }
            ]
          }
        },
        {
          "name": "wallet",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "profileId",
          "type": {
            "array": [
              "u8",
              8
            ]
          }
        },
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "authorityProfileParams"
            }
          }
        }
      ]
    },
    {
      "name": "createSession",
      "discriminator": [
        242,
        193,
        143,
        179,
        150,
        25,
        122,
        227
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "vowState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "vow_state.asset_id",
                "account": "vowState"
              }
            ]
          }
        },
        {
          "name": "sessionAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "vowState"
              },
              {
                "kind": "arg",
                "path": "sessionIndex"
              }
            ]
          }
        },
        {
          "name": "authorityProfile",
          "docs": [
            "Optional authority profile to inherit defaults from."
          ],
          "optional": true
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "vowState"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "sessionKey",
          "type": "pubkey"
        },
        {
          "name": "allowedProgramIds",
          "type": {
            "vec": "pubkey"
          }
        },
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "sessionParams"
            }
          }
        },
        {
          "name": "sessionIndex",
          "type": "u32"
        }
      ]
    },
    {
      "name": "depositYieldBalance",
      "discriminator": [
        176,
        82,
        133,
        138,
        141,
        134,
        255,
        118
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "vowState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "vow_state.asset_id",
                "account": "vowState"
              }
            ]
          }
        },
        {
          "name": "reserve",
          "docs": [
            "Reserve PDA — receives the deposited lamports"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "depositor",
          "docs": [
            "Anyone can top up an identity's yield_balance: the user, session key, or a dApp server."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "unstakeEscrow",
          "docs": [
            "an unstake is in progress because the escrow's lamports_owed was fixed at",
            "begin_unstake time and would not include a post-begin deposit."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  110,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "vowState"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "devFastUnlock",
      "discriminator": [
        183,
        114,
        153,
        43,
        146,
        54,
        188,
        150
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "vowState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "vow_state.asset_id",
                "account": "vowState"
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "devSetSharePrice",
      "discriminator": [
        61,
        23,
        31,
        134,
        225,
        58,
        245,
        61
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": [
        {
          "name": "newPrice",
          "type": "u128"
        }
      ]
    },
    {
      "name": "flushReserveToPool",
      "discriminator": [
        103,
        202,
        110,
        26,
        132,
        24,
        248,
        248
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "reserve",
          "docs": [
            "Reserve naked PDA — source of SOL to deposit"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "reservePoolTokens",
          "docs": [
            "Reserve's ATA for pXNT — must be pre-created (X1 uses a non-standard ATA program;",
            "frontend calls ensureReserveAta() before the first flush)."
          ],
          "writable": true
        },
        {
          "name": "splPool",
          "docs": [
            "X1 Foundation SPL stake pool account"
          ],
          "writable": true
        },
        {
          "name": "poolWithdrawAuthority",
          "docs": [
            "Pool withdraw authority PDA (derived from pool address by stake pool program)"
          ],
          "writable": true
        },
        {
          "name": "poolReserveStake",
          "docs": [
            "Pool's reserve stake account — read from pool account data at offset 131"
          ],
          "writable": true
        },
        {
          "name": "poolManagerFeeAccount",
          "docs": [
            "Pool manager fee account — read from pool account data at offset 195"
          ],
          "writable": true
        },
        {
          "name": "poolReferralFeeAccount",
          "docs": [
            "Referral fee destination — pass same as manager_fee if no referral program"
          ],
          "writable": true
        },
        {
          "name": "poolMint",
          "docs": [
            "pXNT mint"
          ],
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "stakePoolProgram"
        }
      ],
      "args": []
    },
    {
      "name": "harvest",
      "discriminator": [
        228,
        241,
        31,
        182,
        53,
        169,
        59,
        199
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "vowState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "vow_state.asset_id",
                "account": "vowState"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "reserve",
          "docs": [
            "Reserve PDA — lamport-only; receives SOL from mints"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "splPool",
          "docs": [
            "X1 Foundation SPL stake pool — read at init to set the correct opening share price.",
            "On testnet pass SystemProgram.programId (no-op: price stays at SHARE_PRECISION)."
          ]
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "splStakePool",
          "type": "pubkey"
        },
        {
          "name": "splPoolMint",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "mintVow",
      "discriminator": [
        62,
        204,
        30,
        34,
        92,
        0,
        122,
        18
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "assetIdAccount",
          "docs": [
            "asset_id PDA — derived from [b\"vow_asset\", nonce.to_le_bytes()]"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  119,
                  95,
                  97,
                  115,
                  115,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "config.total_minted",
                "account": "protocolConfig"
              }
            ]
          }
        },
        {
          "name": "vowState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "assetIdAccount"
              }
            ]
          }
        },
        {
          "name": "reserve",
          "docs": [
            "Reserve PDA — receives the staked lamports"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "stakeLamports",
          "type": "u64"
        },
        {
          "name": "yieldMode",
          "type": {
            "defined": {
              "name": "yieldMode"
            }
          }
        }
      ]
    },
    {
      "name": "recordCommitment",
      "discriminator": [
        73,
        240,
        201,
        91,
        242,
        96,
        145,
        38
      ],
      "accounts": [
        {
          "name": "commitmentRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  109,
                  109,
                  105,
                  116,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vow_state.owner",
                "account": "vowState"
              }
            ]
          }
        },
        {
          "name": "vowState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "vow_state.asset_id",
                "account": "vowState"
              }
            ]
          }
        },
        {
          "name": "crGate",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  114,
                  95,
                  99,
                  111,
                  109,
                  109,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "commitmentRecord"
              },
              {
                "kind": "account",
                "path": "vowState"
              }
            ]
          }
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "recordFulfillment",
      "discriminator": [
        30,
        160,
        36,
        242,
        114,
        71,
        120,
        2
      ],
      "accounts": [
        {
          "name": "commitmentRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  109,
                  109,
                  105,
                  116,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vow_state.owner",
                "account": "vowState"
              }
            ]
          }
        },
        {
          "name": "vowState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "vow_state.asset_id",
                "account": "vowState"
              }
            ]
          }
        },
        {
          "name": "crGate",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  114,
                  95,
                  102,
                  117,
                  108,
                  102,
                  105,
                  108,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "commitmentRecord"
              },
              {
                "kind": "account",
                "path": "vowState"
              }
            ]
          }
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "registerApp",
      "discriminator": [
        5,
        248,
        20,
        126,
        12,
        159,
        9,
        242
      ],
      "accounts": [
        {
          "name": "appRegistry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  112,
                  112
                ]
              },
              {
                "kind": "arg",
                "path": "programId"
              }
            ]
          }
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "programId",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "revokeSession",
      "discriminator": [
        86,
        92,
        198,
        120,
        144,
        2,
        7,
        194
      ],
      "accounts": [
        {
          "name": "vowState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "vow_state.asset_id",
                "account": "vowState"
              }
            ]
          },
          "relations": [
            "sessionAccount"
          ]
        },
        {
          "name": "sessionAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "vowState"
              },
              {
                "kind": "account",
                "path": "session_account.session_index",
                "account": "sessionAccount"
              }
            ]
          }
        },
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "vowState"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "setAdmin",
      "discriminator": [
        251,
        163,
        0,
        52,
        91,
        194,
        187,
        92
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "newAdmin"
        }
      ],
      "args": []
    },
    {
      "name": "setMintCounter",
      "discriminator": [
        76,
        125,
        75,
        163,
        10,
        196,
        219,
        62
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": [
        {
          "name": "newCounter",
          "type": "u64"
        }
      ]
    },
    {
      "name": "updateAuthorityProfile",
      "discriminator": [
        128,
        41,
        71,
        135,
        101,
        218,
        1,
        140
      ],
      "accounts": [
        {
          "name": "authorityProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                  95,
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "wallet"
              },
              {
                "kind": "account",
                "path": "authority_profile.profile_id",
                "account": "authorityProfile"
              }
            ]
          }
        },
        {
          "name": "wallet",
          "signer": true,
          "relations": [
            "authorityProfile"
          ]
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "authorityProfileParams"
            }
          }
        }
      ]
    },
    {
      "name": "updateSharePrice",
      "discriminator": [
        187,
        82,
        214,
        110,
        19,
        147,
        149,
        70
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "splPool",
          "docs": [
            "The X1 Foundation SPL stake pool account.",
            "Address is verified against config.spl_stake_pool so the crank",
            "cannot pass an attacker-controlled account to manipulate the price."
          ]
        }
      ],
      "args": []
    },
    {
      "name": "updateYieldMode",
      "discriminator": [
        151,
        81,
        201,
        162,
        184,
        80,
        204,
        133
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "vowState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "vow_state.asset_id",
                "account": "vowState"
              }
            ]
          }
        },
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "vowState"
          ]
        }
      ],
      "args": [
        {
          "name": "newMode",
          "type": {
            "defined": {
              "name": "yieldMode"
            }
          }
        }
      ]
    },
    {
      "name": "verifyApp",
      "discriminator": [
        96,
        168,
        52,
        166,
        191,
        211,
        101,
        23
      ],
      "accounts": [
        {
          "name": "appRegistry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  112,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "app_registry.program_id",
                "account": "appRegistry"
              }
            ]
          }
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "withdrawFromPool",
      "discriminator": [
        62,
        33,
        128,
        81,
        40,
        234,
        29,
        77
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "reserve",
          "docs": [
            "Reserve — receives SOL after withdrawal, and signs as pool token authority"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "unstakeEscrow",
          "docs": [
            "The pending unstake that justifies this withdrawal.",
            "Proves there is a real payout that the reserve cannot currently cover."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  110,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "unstake_escrow.vow_state",
                "account": "unstakeEscrow"
              }
            ]
          }
        },
        {
          "name": "reservePoolTokens",
          "docs": [
            "Reserve's pXNT token account — tokens to burn"
          ],
          "writable": true
        },
        {
          "name": "splPool",
          "docs": [
            "X1 Foundation SPL stake pool account"
          ],
          "writable": true
        },
        {
          "name": "poolWithdrawAuthority",
          "docs": [
            "Pool withdraw authority PDA"
          ]
        },
        {
          "name": "poolReserveStake",
          "docs": [
            "Pool's reserve stake account — read from pool data at offset 131"
          ],
          "writable": true
        },
        {
          "name": "poolManagerFeeAccount",
          "docs": [
            "Pool manager fee account — read from pool data at offset 195"
          ],
          "writable": true
        },
        {
          "name": "poolMint",
          "docs": [
            "pXNT mint"
          ],
          "writable": true
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        },
        {
          "name": "stakeHistory",
          "address": "SysvarStakeHistory1111111111111111111111111"
        },
        {
          "name": "stakeProgram",
          "address": "Stake11111111111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "stakePoolProgram"
        }
      ],
      "args": []
    },
    {
      "name": "withdrawYield",
      "discriminator": [
        62,
        9,
        132,
        32,
        96,
        57,
        101,
        82
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "vowState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "vow_state.asset_id",
                "account": "vowState"
              }
            ]
          }
        },
        {
          "name": "reserve",
          "docs": [
            "Reserve PDA — source of yield lamports"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "vowState"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": {
            "option": "u64"
          }
        }
      ]
    },
    {
      "name": "yieldSpend",
      "discriminator": [
        192,
        179,
        130,
        131,
        203,
        1,
        200,
        148
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "vowState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "vow_state.asset_id",
                "account": "vowState"
              }
            ]
          },
          "relations": [
            "sessionAccount"
          ]
        },
        {
          "name": "sessionAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "vowState"
              },
              {
                "kind": "account",
                "path": "session_account.session_index",
                "account": "sessionAccount"
              }
            ]
          }
        },
        {
          "name": "callingProgram",
          "docs": [
            "The calling application's program account — must be executable and in allowed_program_ids."
          ]
        },
        {
          "name": "appRegistry",
          "docs": [
            "Optional: app registry entry for the calling program.",
            "C-1 fix: seeds enforced at instruction level — caller must pass the registry",
            "for `calling_program`, not a different program's."
          ],
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  112,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "callingProgram"
              }
            ]
          }
        },
        {
          "name": "reserve",
          "docs": [
            "Reserve PDA — source of yield lamports"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "destination",
          "docs": [
            "Destination for the yield payment"
          ],
          "writable": true
        },
        {
          "name": "sessionSigner",
          "docs": [
            "The ephemeral session key must sign this transaction"
          ],
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "appRegistry",
      "discriminator": [
        199,
        158,
        94,
        103,
        136,
        111,
        87,
        65
      ]
    },
    {
      "name": "authorityProfile",
      "discriminator": [
        123,
        172,
        66,
        188,
        112,
        144,
        46,
        220
      ]
    },
    {
      "name": "commitmentRecord",
      "discriminator": [
        216,
        195,
        138,
        99,
        88,
        191,
        32,
        246
      ]
    },
    {
      "name": "crGate",
      "discriminator": [
        45,
        99,
        244,
        164,
        49,
        65,
        121,
        0
      ]
    },
    {
      "name": "protocolConfig",
      "discriminator": [
        207,
        91,
        250,
        28,
        152,
        179,
        215,
        209
      ]
    },
    {
      "name": "sessionAccount",
      "discriminator": [
        74,
        34,
        65,
        133,
        96,
        163,
        80,
        69
      ]
    },
    {
      "name": "unstakeEscrow",
      "discriminator": [
        96,
        200,
        103,
        50,
        136,
        204,
        136,
        188
      ]
    },
    {
      "name": "vowState",
      "discriminator": [
        72,
        160,
        132,
        202,
        100,
        68,
        220,
        166
      ]
    }
  ],
  "events": [
    {
      "name": "appBlocked",
      "discriminator": [
        75,
        126,
        24,
        116,
        36,
        210,
        19,
        48
      ]
    },
    {
      "name": "appRegistered",
      "discriminator": [
        99,
        12,
        19,
        34,
        85,
        60,
        170,
        229
      ]
    },
    {
      "name": "harvested",
      "discriminator": [
        249,
        229,
        78,
        151,
        106,
        185,
        149,
        11
      ]
    },
    {
      "name": "protocolInitialized",
      "discriminator": [
        173,
        122,
        168,
        254,
        9,
        118,
        76,
        132
      ]
    },
    {
      "name": "sessionCreated",
      "discriminator": [
        107,
        111,
        254,
        25,
        21,
        122,
        220,
        225
      ]
    },
    {
      "name": "sessionRevoked",
      "discriminator": [
        90,
        48,
        35,
        234,
        203,
        192,
        126,
        211
      ]
    },
    {
      "name": "sharePriceUpdated",
      "discriminator": [
        87,
        183,
        68,
        144,
        145,
        36,
        213,
        4
      ]
    },
    {
      "name": "stakeAdded",
      "discriminator": [
        139,
        170,
        134,
        90,
        22,
        96,
        23,
        193
      ]
    },
    {
      "name": "vowMatured",
      "discriminator": [
        21,
        107,
        88,
        104,
        175,
        157,
        36,
        16
      ]
    },
    {
      "name": "vowMinted",
      "discriminator": [
        25,
        197,
        235,
        212,
        79,
        206,
        191,
        117
      ]
    },
    {
      "name": "vowStakeActivated",
      "discriminator": [
        71,
        18,
        14,
        167,
        217,
        12,
        49,
        210
      ]
    },
    {
      "name": "vowUnstakeBegun",
      "discriminator": [
        10,
        152,
        5,
        230,
        61,
        11,
        52,
        234
      ]
    },
    {
      "name": "vowUnstaked",
      "discriminator": [
        40,
        56,
        87,
        197,
        179,
        42,
        185,
        13
      ]
    },
    {
      "name": "yieldDeposited",
      "discriminator": [
        240,
        44,
        237,
        73,
        80,
        47,
        196,
        86
      ]
    },
    {
      "name": "yieldModeUpdated",
      "discriminator": [
        98,
        192,
        69,
        114,
        18,
        158,
        217,
        61
      ]
    },
    {
      "name": "yieldSpent",
      "discriminator": [
        11,
        184,
        14,
        135,
        55,
        241,
        255,
        105
      ]
    },
    {
      "name": "yieldWithdrawn",
      "discriminator": [
        175,
        101,
        144,
        232,
        244,
        176,
        99,
        108
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "insufficientStake",
      "msg": "Insufficient stake amount for any class"
    },
    {
      "code": 6001,
      "name": "stakeOverflow",
      "msg": "Stake amount exceeds maximum"
    },
    {
      "code": 6002,
      "name": "notMatured",
      "msg": "Vow identity has not yet matured"
    },
    {
      "code": 6003,
      "name": "alreadyMatured",
      "msg": "Vow identity is already matured"
    },
    {
      "code": 6004,
      "name": "alreadyUnstaking",
      "msg": "Vow identity is already in unstake state"
    },
    {
      "code": 6005,
      "name": "notUnstaking",
      "msg": "Vow identity is not in unstake state"
    },
    {
      "code": 6006,
      "name": "invalidAssetId",
      "msg": "Invalid asset ID for this nonce"
    },
    {
      "code": 6007,
      "name": "invalidOwner",
      "msg": "Invalid owner — Vow identity owner mismatch"
    },
    {
      "code": 6008,
      "name": "sessionExpired",
      "msg": "Session is expired"
    },
    {
      "code": 6009,
      "name": "sessionInactive",
      "msg": "Session is not active"
    },
    {
      "code": 6010,
      "name": "sessionInvalidated",
      "msg": "Session was invalidated — identity unstaked or re-activated"
    },
    {
      "code": 6011,
      "name": "programNotAllowed",
      "msg": "Calling program is not in session's allowed_program_ids"
    },
    {
      "code": 6012,
      "name": "dailyLimitExceeded",
      "msg": "Daily spend limit exceeded"
    },
    {
      "code": 6013,
      "name": "lifetimeLimitExceeded",
      "msg": "Lifetime spend limit exceeded"
    },
    {
      "code": 6014,
      "name": "velocityLimitExceeded",
      "msg": "Transaction velocity limit exceeded"
    },
    {
      "code": 6015,
      "name": "insufficientYieldBalance",
      "msg": "Insufficient yield balance"
    },
    {
      "code": 6016,
      "name": "appBlocked",
      "msg": "Application is blocked"
    },
    {
      "code": 6017,
      "name": "sharePriceOverflow",
      "msg": "Share price computation overflow"
    },
    {
      "code": 6018,
      "name": "sharesUnderflow",
      "msg": "Shares underflow — insufficient shares to burn"
    },
    {
      "code": 6019,
      "name": "noRewards",
      "msg": "No rewards available to harvest"
    },
    {
      "code": 6020,
      "name": "yieldModeUnchanged",
      "msg": "Yield mode is unchanged"
    },
    {
      "code": 6021,
      "name": "profileNotFound",
      "msg": "Authority profile not found"
    },
    {
      "code": 6022,
      "name": "profileIdTaken",
      "msg": "Authority profile ID already in use"
    },
    {
      "code": 6023,
      "name": "tooManyProgramIds",
      "msg": "Maximum allowed program IDs per session exceeded"
    },
    {
      "code": 6024,
      "name": "invalidStakeAccount",
      "msg": "Invalid stake account data"
    },
    {
      "code": 6025,
      "name": "unauthorized",
      "msg": "Unauthorized — admin only"
    },
    {
      "code": 6026,
      "name": "mathOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6027,
      "name": "stakeNotDeactivated",
      "msg": "Stake deactivation not yet complete — wait one epoch after begin_unstake"
    },
    {
      "code": 6028,
      "name": "emptyReserve",
      "msg": "Reserve is empty"
    },
    {
      "code": 6029,
      "name": "treeCapacityExhausted",
      "msg": "Merkle tree capacity exhausted"
    },
    {
      "code": 6030,
      "name": "stakeAccountMismatch",
      "msg": "Pool stake account does not match the validator entry's registered stake account"
    },
    {
      "code": 6031,
      "name": "identityInactive",
      "msg": "Vow identity has no active stake — call recommit to re-activate"
    },
    {
      "code": 6032,
      "name": "identityAlreadyActive",
      "msg": "Vow identity already has an active stake position — unstake first"
    },
    {
      "code": 6033,
      "name": "appRegistryMismatch",
      "msg": "App registry account does not match calling program"
    },
    {
      "code": 6034,
      "name": "reserveSufficient",
      "msg": "Reserve has sufficient SOL — withdraw_from_pool only callable when reserve cannot cover the pending unstake"
    },
    {
      "code": 6035,
      "name": "sharePriceNotSynced",
      "msg": "Share price not yet synced from pool — call update_share_price before minting"
    }
  ],
  "types": [
    {
      "name": "appBlocked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "programId",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "appRegistered",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "programId",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "appRegistry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "programId",
            "type": "pubkey"
          },
          {
            "name": "verified",
            "type": "bool"
          },
          {
            "name": "blocked",
            "type": "bool"
          },
          {
            "name": "registeredAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "authorityProfile",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "profileId",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "defaultDailyLimit",
            "type": "u64"
          },
          {
            "name": "defaultLifetimeLimit",
            "type": "u64"
          },
          {
            "name": "defaultExpiryDays",
            "type": "u32"
          },
          {
            "name": "defaultAllowedProgramIds",
            "type": {
              "array": [
                "pubkey",
                8
              ]
            }
          },
          {
            "name": "programCount",
            "type": "u8"
          },
          {
            "name": "metadataUri",
            "type": {
              "array": [
                "u8",
                128
              ]
            }
          },
          {
            "name": "uriLen",
            "type": "u8"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "authorityProfileParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "defaultDailyLimit",
            "type": "u64"
          },
          {
            "name": "defaultLifetimeLimit",
            "type": "u64"
          },
          {
            "name": "defaultExpiryDays",
            "type": "u32"
          },
          {
            "name": "defaultAllowedProgramIds",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "metadataUri",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "commitmentRecord",
      "docs": [
        "V2 — commitment reputation, non-transferable, wallet-bound.",
        "Tracks historical commitment as a pure reputation metric."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "totalXnftsMinted",
            "type": "u32"
          },
          {
            "name": "totalXntCommitted",
            "type": "u64"
          },
          {
            "name": "totalXntFulfilled",
            "type": "u64"
          },
          {
            "name": "highestClassEver",
            "type": "u8"
          },
          {
            "name": "totalCommitmentDays",
            "type": "u64"
          },
          {
            "name": "commitmentScore",
            "type": "u32"
          },
          {
            "name": "lastUpdated",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "crGate",
      "docs": [
        "Idempotency guard for commitment record instructions.",
        "One PDA per (CommitmentRecord, VowState) pair — prevents re-recording the",
        "same identity more than once."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "harvested",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "assetId",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "gain",
            "type": "i64"
          },
          {
            "name": "yieldCredited",
            "type": "u64"
          },
          {
            "name": "sharesBurned",
            "type": "u128"
          }
        ]
      }
    },
    {
      "name": "protocolConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "currentSharePrice",
            "type": "u128"
          },
          {
            "name": "totalShares",
            "type": "u128"
          },
          {
            "name": "totalYieldClaims",
            "type": "u64"
          },
          {
            "name": "lastPoolLamports",
            "type": "u64"
          },
          {
            "name": "totalMinted",
            "type": "u64"
          },
          {
            "name": "merkleTree",
            "type": "pubkey"
          },
          {
            "name": "totalPendingUnstake",
            "type": "u64"
          },
          {
            "name": "splStakePool",
            "type": "pubkey"
          },
          {
            "name": "splPoolMint",
            "type": "pubkey"
          },
          {
            "name": "reserveBump",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "protocolInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "merkleTree",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "sessionAccount",
      "docs": [
        "A session key authorization account. The PDA is derived from",
        "[b\"session\", vow_state, session_index_le4].",
        "",
        "session_index is user-chosen (0, 1, 2, …) and is a stable human-meaningful slot.",
        "creation_nonce is copied from VowState.session_nonce at the moment of creation,",
        "making each session's keypair derivation unique even if the same index is reused.",
        "",
        "Recoverable Session derivation (client-side, Version 2):",
        "msg = \"VOW Session Authorization\\nDomain: <origin>\\nProgram: <PROGRAM_ID>\\nIdentity: <vow_state>\\nNonce: <creation_nonce>\\nVersion: 2\"",
        "sig = wallet.signMessage(msg)   // 64-byte Ed25519 signature",
        "seed = SHA-256(sig)             // hash full sig to eliminate seed bias",
        "→ Keypair.fromSeed(seed)"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vowState",
            "type": "pubkey"
          },
          {
            "name": "sessionKey",
            "type": "pubkey"
          },
          {
            "name": "allowedProgramIds",
            "type": {
              "array": [
                "pubkey",
                8
              ]
            }
          },
          {
            "name": "programCount",
            "type": "u8"
          },
          {
            "name": "sessionIndex",
            "docs": [
              "Stable slot index chosen by the user. PDA seed."
            ],
            "type": "u32"
          },
          {
            "name": "creationNonce",
            "docs": [
              "VowState.session_nonce at time of creation. Used for Recoverable Session",
              "key derivation — ensures unique keys even when an index slot is reused."
            ],
            "type": "u64"
          },
          {
            "name": "startTs",
            "type": "i64"
          },
          {
            "name": "expiryTs",
            "type": "i64"
          },
          {
            "name": "dailyLimit",
            "type": "u64"
          },
          {
            "name": "lifetimeLimit",
            "type": "u64"
          },
          {
            "name": "velocityLimit",
            "type": "u32"
          },
          {
            "name": "spentToday",
            "type": "u64"
          },
          {
            "name": "spentTotal",
            "type": "u64"
          },
          {
            "name": "txCountToday",
            "type": "u32"
          },
          {
            "name": "lastResetDay",
            "type": "i64"
          },
          {
            "name": "active",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "sessionCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vowState",
            "type": "pubkey"
          },
          {
            "name": "sessionKey",
            "type": "pubkey"
          },
          {
            "name": "expiryTs",
            "type": "i64"
          },
          {
            "name": "creationNonce",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "sessionParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "expiryTs",
            "type": "i64"
          },
          {
            "name": "dailyLimit",
            "type": "u64"
          },
          {
            "name": "lifetimeLimit",
            "type": "u64"
          },
          {
            "name": "velocityLimit",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "sessionRevoked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vowState",
            "type": "pubkey"
          },
          {
            "name": "sessionKey",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "sharePriceUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "oldPrice",
            "type": "u128"
          },
          {
            "name": "newPrice",
            "type": "u128"
          },
          {
            "name": "poolLamports",
            "type": "u64"
          },
          {
            "name": "totalShares",
            "type": "u128"
          }
        ]
      }
    },
    {
      "name": "stakeAdded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "assetId",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "lamportsAdded",
            "type": "u64"
          },
          {
            "name": "newPrincipal",
            "type": "u64"
          },
          {
            "name": "oldClass",
            "type": "u8"
          },
          {
            "name": "newClass",
            "type": "u8"
          },
          {
            "name": "newUnlockAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "unstakeEscrow",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vowState",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "lamportsOwed",
            "type": "u64"
          },
          {
            "name": "deactivationEpoch",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "vowMatured",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "assetId",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "class",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "vowMinted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "assetId",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "class",
            "type": "u8"
          },
          {
            "name": "stakeLamports",
            "type": "u64"
          },
          {
            "name": "shares",
            "type": "u128"
          },
          {
            "name": "unlockAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "vowStakeActivated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "assetId",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "newClass",
            "type": "u8"
          },
          {
            "name": "stakeLamports",
            "type": "u64"
          },
          {
            "name": "shares",
            "type": "u128"
          },
          {
            "name": "unlockAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "vowState",
      "docs": [
        "Soulbound identity NFT. The owner field is immutable after mint.",
        "The account persists permanently on-chain as a historical identity",
        "credential regardless of stake state. Two lifecycle states:",
        "",
        "Active Identity:  active_stake == true   (sessions allowed, yield spendable)",
        "Dormant Identity: active_stake == false  (identity preserved, no new sessions)",
        "",
        "Reputation fields (first_staked_at, total_commitments, total_fulfilled,",
        "cumulative_stake_days, highest_class_ever) are append-only — never reset",
        "by unstake or activate_stake."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "assetId",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "class",
            "type": "u8"
          },
          {
            "name": "nonce",
            "type": "u64"
          },
          {
            "name": "principalLamports",
            "type": "u64"
          },
          {
            "name": "shares",
            "type": "u128"
          },
          {
            "name": "lastSharePrice",
            "type": "u128"
          },
          {
            "name": "accruedGain",
            "type": "i64"
          },
          {
            "name": "yieldMode",
            "type": {
              "defined": {
                "name": "yieldMode"
              }
            }
          },
          {
            "name": "yieldBalance",
            "type": "u64"
          },
          {
            "name": "totalHarvested",
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "unlockAt",
            "type": "i64"
          },
          {
            "name": "matured",
            "type": "bool"
          },
          {
            "name": "sessionsInvalidatedAt",
            "docs": [
              "Set by complete_unstake and activate_stake to expire existing sessions."
            ],
            "type": "i64"
          },
          {
            "name": "activeStake",
            "docs": [
              "Active Identity when true; Dormant Identity when false.",
              "Sessions cannot be created and yield cannot be spent when false."
            ],
            "type": "bool"
          },
          {
            "name": "sessionNonce",
            "docs": [
              "Monotonically increasing counter. Incremented by create_session.",
              "Stored in SessionAccount.creation_nonce so any device can re-derive the",
              "session keypair from: signMessage(program || vow || nonce).",
              "Ensures unique session keys even when an index slot is reused."
            ],
            "type": "u64"
          },
          {
            "name": "firstStakedAt",
            "type": "i64"
          },
          {
            "name": "currentStakeStartedAt",
            "type": "i64"
          },
          {
            "name": "totalCommitments",
            "type": "u32"
          },
          {
            "name": "totalFulfilled",
            "type": "u32"
          },
          {
            "name": "cumulativeStakeDays",
            "type": "u64"
          },
          {
            "name": "highestClassEver",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "vowUnstakeBegun",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "assetId",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "lamportsOwed",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "vowUnstaked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "assetId",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "lamportsReturned",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "yieldDeposited",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "assetId",
            "type": "pubkey"
          },
          {
            "name": "depositor",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "yieldMode",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "compound"
          },
          {
            "name": "hybrid"
          },
          {
            "name": "treasury"
          }
        ]
      }
    },
    {
      "name": "yieldModeUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "assetId",
            "type": "pubkey"
          },
          {
            "name": "oldMode",
            "type": "u8"
          },
          {
            "name": "newMode",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "yieldSpent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "assetId",
            "type": "pubkey"
          },
          {
            "name": "sessionKey",
            "type": "pubkey"
          },
          {
            "name": "programId",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "destination",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "yieldWithdrawn",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "assetId",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
