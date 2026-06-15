/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/idnft.json`.
 */
export type Idnft = {
  "address": "HRwze7aVokE5fjfm2qVn9rVq5CAAFiD3BPEFMGei8edF",
  "metadata": {
    "name": "idnft",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "IDNFT Protocol — Soulbound identity, session keys, and stake-backed credentials on X1 Network"
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
          "name": "stakePool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "idnftState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  100,
                  110,
                  102,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "idnft_state.asset_id",
                "account": "idNftState"
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
            "idnftState"
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
      "name": "addValidator",
      "discriminator": [
        250,
        113,
        53,
        54,
        141,
        117,
        215,
        185
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
          "name": "stakePool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "validatorEntry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  108,
                  105,
                  100,
                  97,
                  116,
                  111,
                  114
                ]
              },
              {
                "kind": "arg",
                "path": "voteAccount"
              }
            ]
          }
        },
        {
          "name": "poolStake",
          "docs": [
            "Pool stake account PDA — lamport-only; funded and delegated separately"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "voteAccount"
              }
            ]
          }
        },
        {
          "name": "voteAccountInfo"
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "voteAccount",
          "type": "pubkey"
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
          "name": "stakePool",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "idnftState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  100,
                  110,
                  102,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "idnft_state.asset_id",
                "account": "idNftState"
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
                "path": "idnftState"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "idnftState"
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
          "writable": true
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
          "name": "idnftState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  100,
                  110,
                  102,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "idnft_state.asset_id",
                "account": "idNftState"
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
                "path": "idnftState"
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
            "idnftState"
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
          "name": "stakePool",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "idnftState",
          "docs": [
            "IDNFT state is NOT closed — it persists as a permanent identity credential."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  100,
                  110,
                  102,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "idnft_state.asset_id",
                "account": "idNftState"
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
                "path": "idnftState"
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
            "idnftState",
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
          "name": "idnftState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  100,
                  110,
                  102,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "idnft_state.asset_id",
                "account": "idNftState"
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
                "path": "idnftState"
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
            "idnftState"
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
      "name": "deactivatePoolStake",
      "discriminator": [
        244,
        247,
        41,
        166,
        88,
        56,
        195,
        56
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
          "name": "validatorEntry",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  108,
                  105,
                  100,
                  97,
                  116,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "validator_entry.vote_account",
                "account": "validatorEntry"
              }
            ]
          }
        },
        {
          "name": "poolStake",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "validator_entry.vote_account",
                "account": "validatorEntry"
              }
            ]
          }
        },
        {
          "name": "poolAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        },
        {
          "name": "stakeProgram",
          "address": "Stake11111111111111111111111111111111111111"
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
      "name": "delegatePoolStake",
      "discriminator": [
        197,
        64,
        172,
        174,
        14,
        172,
        204,
        207
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
          "name": "stakePool",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "validatorEntry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  108,
                  105,
                  100,
                  97,
                  116,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "validator_entry.vote_account",
                "account": "validatorEntry"
              }
            ]
          }
        },
        {
          "name": "poolStake",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "validator_entry.vote_account",
                "account": "validatorEntry"
              }
            ]
          }
        },
        {
          "name": "poolAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "voteAccountInfo"
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
        }
      ],
      "args": []
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
          "name": "stakePool",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "validatorEntry",
          "docs": [
            "Registered validator entry — constrains which pool_stake is valid"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  108,
                  105,
                  100,
                  97,
                  116,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "validator_entry.vote_account",
                "account": "validatorEntry"
              }
            ]
          }
        },
        {
          "name": "reserve",
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
          "name": "poolStake",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "validator_entry.vote_account",
                "account": "validatorEntry"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
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
          "name": "idnftState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  100,
                  110,
                  102,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "idnft_state.asset_id",
                "account": "idNftState"
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
          "name": "stakePool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "reserve",
          "docs": [
            "Reserve PDA — lamport-only; receives SOL from mints, no data stored"
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
          "name": "weights",
          "type": {
            "defined": {
              "name": "scoringWeights"
            }
          }
        }
      ]
    },
    {
      "name": "initializePoolStake",
      "discriminator": [
        32,
        30,
        163,
        44,
        201,
        173,
        205,
        208
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
          "name": "stakePool",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "validatorEntry",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  108,
                  105,
                  100,
                  97,
                  116,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "validator_entry.vote_account",
                "account": "validatorEntry"
              }
            ]
          }
        },
        {
          "name": "poolStake",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "validator_entry.vote_account",
                "account": "validatorEntry"
              }
            ]
          }
        },
        {
          "name": "poolAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "stakeProgram",
          "address": "Stake11111111111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "mintIdnft",
      "discriminator": [
        251,
        105,
        18,
        233,
        67,
        218,
        186,
        57
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
          "name": "stakePool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "assetIdAccount",
          "docs": [
            "asset_id PDA — derived from [b\"idnft_asset\", nonce.to_le_bytes()]"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  100,
                  110,
                  102,
                  116,
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
          "name": "idnftState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  100,
                  110,
                  102,
                  116
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
      "name": "pauseProtocol",
      "discriminator": [
        144,
        95,
        0,
        107,
        119,
        39,
        248,
        141
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
      "args": []
    },
    {
      "name": "rebalancePool",
      "discriminator": [
        51,
        166,
        130,
        88,
        225,
        7,
        165,
        16
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
          "name": "stakePool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": []
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
                "path": "idnft_state.owner",
                "account": "idNftState"
              }
            ]
          }
        },
        {
          "name": "idnftState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  100,
                  110,
                  102,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "idnft_state.asset_id",
                "account": "idNftState"
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
                "path": "idnft_state.owner",
                "account": "idNftState"
              }
            ]
          }
        },
        {
          "name": "idnftState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  100,
                  110,
                  102,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "idnft_state.asset_id",
                "account": "idNftState"
              }
            ]
          }
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
      "name": "removeValidator",
      "discriminator": [
        25,
        96,
        211,
        155,
        161,
        14,
        168,
        188
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
          "name": "stakePool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "validatorEntry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  108,
                  105,
                  100,
                  97,
                  116,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "validator_entry.vote_account",
                "account": "validatorEntry"
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
      "name": "resumeProtocol",
      "discriminator": [
        62,
        91,
        76,
        18,
        174,
        87,
        87,
        208
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
      "args": []
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
          "name": "idnftState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  100,
                  110,
                  102,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "idnft_state.asset_id",
                "account": "idNftState"
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
                "path": "idnftState"
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
            "idnftState"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "scoreValidator",
      "discriminator": [
        71,
        56,
        95,
        206,
        190,
        239,
        156,
        92
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
          "name": "validatorEntry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  108,
                  105,
                  100,
                  97,
                  116,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "validator_entry.vote_account",
                "account": "validatorEntry"
              }
            ]
          }
        },
        {
          "name": "voteAccountInfo"
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
          "name": "avgCreditsPerEpoch",
          "type": "u64"
        },
        {
          "name": "activeEpochCount",
          "type": "u8"
        },
        {
          "name": "commission",
          "type": "u8"
        },
        {
          "name": "selfStakeLamports",
          "type": "u64"
        }
      ]
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
      "name": "updateScoringWeights",
      "discriminator": [
        211,
        128,
        188,
        229,
        1,
        203,
        41,
        227
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
          "name": "creditsWeight",
          "type": "u32"
        },
        {
          "name": "selfStakeWeight",
          "type": "u32"
        },
        {
          "name": "selfStakeCeil",
          "type": "u64"
        },
        {
          "name": "skipPenalty",
          "type": "u32"
        },
        {
          "name": "commissionPenalty",
          "type": "u32"
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
          "name": "stakePool",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "reserve",
          "docs": [
            "does not disappear from the share price calculation."
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
          "name": "idnftState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  100,
                  110,
                  102,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "idnft_state.asset_id",
                "account": "idNftState"
              }
            ]
          }
        },
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "idnftState"
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
          "writable": true
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
      "name": "withdrawStakeToReserve",
      "discriminator": [
        50,
        199,
        238,
        2,
        108,
        71,
        147,
        158
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
          "name": "stakePool",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "validatorEntry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  108,
                  105,
                  100,
                  97,
                  116,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "validator_entry.vote_account",
                "account": "validatorEntry"
              }
            ]
          }
        },
        {
          "name": "poolStake",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "validator_entry.vote_account",
                "account": "validatorEntry"
              }
            ]
          }
        },
        {
          "name": "poolAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "reserve",
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
          "name": "stakePool",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "idnftState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  100,
                  110,
                  102,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "idnft_state.asset_id",
                "account": "idNftState"
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
            "idnftState"
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
          "name": "stakePool",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "idnftState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  100,
                  110,
                  102,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "idnft_state.asset_id",
                "account": "idNftState"
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
                "path": "idnftState"
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
            "The calling application's program account — must be in allowed_program_ids and be executable."
          ]
        },
        {
          "name": "appRegistry",
          "docs": [
            "Optional: app registry entry — checked for blocked status if provided"
          ],
          "optional": true
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
      "name": "idNftState",
      "discriminator": [
        80,
        36,
        147,
        108,
        245,
        72,
        4,
        77
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
      "name": "stakePool",
      "discriminator": [
        121,
        34,
        206,
        21,
        79,
        127,
        255,
        28
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
      "name": "validatorEntry",
      "discriminator": [
        174,
        87,
        76,
        168,
        228,
        42,
        70,
        4
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
      "name": "idNftMatured",
      "discriminator": [
        247,
        174,
        233,
        226,
        94,
        136,
        121,
        248
      ]
    },
    {
      "name": "idNftMinted",
      "discriminator": [
        35,
        240,
        224,
        237,
        8,
        108,
        230,
        33
      ]
    },
    {
      "name": "idNftStakeActivated",
      "discriminator": [
        198,
        96,
        156,
        220,
        232,
        216,
        152,
        172
      ]
    },
    {
      "name": "idNftUnstakeBegun",
      "discriminator": [
        134,
        39,
        179,
        6,
        227,
        110,
        136,
        127
      ]
    },
    {
      "name": "idNftUnstaked",
      "discriminator": [
        233,
        161,
        45,
        210,
        19,
        75,
        181,
        94
      ]
    },
    {
      "name": "poolRebalanced",
      "discriminator": [
        75,
        223,
        62,
        177,
        222,
        42,
        34,
        141
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
      "name": "rebalanceTargetsSet",
      "discriminator": [
        18,
        161,
        62,
        103,
        66,
        203,
        18,
        216
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
      "name": "stakeDeactivated",
      "discriminator": [
        202,
        88,
        80,
        236,
        248,
        129,
        102,
        236
      ]
    },
    {
      "name": "stakeDelegated",
      "discriminator": [
        126,
        201,
        132,
        208,
        255,
        188,
        95,
        225
      ]
    },
    {
      "name": "stakeInitialized",
      "discriminator": [
        148,
        201,
        109,
        225,
        10,
        33,
        117,
        163
      ]
    },
    {
      "name": "stakeWithdrawn",
      "discriminator": [
        33,
        120,
        159,
        58,
        140,
        255,
        174,
        79
      ]
    },
    {
      "name": "validatorAdded",
      "discriminator": [
        67,
        26,
        43,
        25,
        58,
        219,
        99,
        48
      ]
    },
    {
      "name": "validatorScored",
      "discriminator": [
        70,
        141,
        83,
        173,
        171,
        231,
        79,
        198
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
      "name": "protocolPaused",
      "msg": "Protocol is paused"
    },
    {
      "code": 6001,
      "name": "insufficientStake",
      "msg": "Insufficient stake amount for any class"
    },
    {
      "code": 6002,
      "name": "stakeOverflow",
      "msg": "Stake amount exceeds maximum"
    },
    {
      "code": 6003,
      "name": "notMatured",
      "msg": "Vow identity has not yet matured"
    },
    {
      "code": 6004,
      "name": "alreadyMatured",
      "msg": "Vow identity is already matured"
    },
    {
      "code": 6005,
      "name": "alreadyUnstaking",
      "msg": "Vow identity is already in unstake state"
    },
    {
      "code": 6006,
      "name": "notUnstaking",
      "msg": "Vow identity is not in unstake state"
    },
    {
      "code": 6007,
      "name": "invalidAssetId",
      "msg": "Invalid asset ID for this nonce"
    },
    {
      "code": 6008,
      "name": "invalidOwner",
      "msg": "Invalid owner — Vow identity owner mismatch"
    },
    {
      "code": 6009,
      "name": "sessionExpired",
      "msg": "Session is expired"
    },
    {
      "code": 6010,
      "name": "sessionInactive",
      "msg": "Session is not active"
    },
    {
      "code": 6011,
      "name": "sessionInvalidated",
      "msg": "Session was invalidated — identity unstaked or re-activated"
    },
    {
      "code": 6012,
      "name": "programNotAllowed",
      "msg": "Calling program is not in session's allowed_program_ids"
    },
    {
      "code": 6013,
      "name": "dailyLimitExceeded",
      "msg": "Daily spend limit exceeded"
    },
    {
      "code": 6014,
      "name": "lifetimeLimitExceeded",
      "msg": "Lifetime spend limit exceeded"
    },
    {
      "code": 6015,
      "name": "velocityLimitExceeded",
      "msg": "Transaction velocity limit exceeded"
    },
    {
      "code": 6016,
      "name": "insufficientYieldBalance",
      "msg": "Insufficient yield balance"
    },
    {
      "code": 6017,
      "name": "appBlocked",
      "msg": "Application is blocked"
    },
    {
      "code": 6018,
      "name": "validatorAlreadyExists",
      "msg": "Validator is already registered"
    },
    {
      "code": 6019,
      "name": "validatorNotFound",
      "msg": "Validator not found"
    },
    {
      "code": 6020,
      "name": "maxValidatorsReached",
      "msg": "Maximum validator count reached"
    },
    {
      "code": 6021,
      "name": "noActiveValidators",
      "msg": "Pool has no active validators"
    },
    {
      "code": 6022,
      "name": "sharePriceOverflow",
      "msg": "Share price computation overflow"
    },
    {
      "code": 6023,
      "name": "sharesUnderflow",
      "msg": "Shares underflow — insufficient shares to burn"
    },
    {
      "code": 6024,
      "name": "noRewards",
      "msg": "No rewards available to harvest"
    },
    {
      "code": 6025,
      "name": "yieldModeUnchanged",
      "msg": "Yield mode is unchanged"
    },
    {
      "code": 6026,
      "name": "profileNotFound",
      "msg": "Authority profile not found"
    },
    {
      "code": 6027,
      "name": "profileIdTaken",
      "msg": "Authority profile ID already in use"
    },
    {
      "code": 6028,
      "name": "tooManyProgramIds",
      "msg": "Maximum allowed program IDs per session exceeded"
    },
    {
      "code": 6029,
      "name": "validatorInactive",
      "msg": "Validator is inactive"
    },
    {
      "code": 6030,
      "name": "invalidVoteAccount",
      "msg": "Invalid vote account data"
    },
    {
      "code": 6031,
      "name": "invalidStakeAccount",
      "msg": "Invalid stake account data"
    },
    {
      "code": 6032,
      "name": "unauthorized",
      "msg": "Unauthorized — admin only"
    },
    {
      "code": 6033,
      "name": "mathOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6034,
      "name": "stakeNotDeactivated",
      "msg": "Stake deactivation not yet complete — wait one epoch after begin_unstake"
    },
    {
      "code": 6035,
      "name": "emptyReserve",
      "msg": "Reserve is empty"
    },
    {
      "code": 6036,
      "name": "rebalanceTooSoon",
      "msg": "Rebalance already performed this epoch"
    },
    {
      "code": 6037,
      "name": "treeCapacityExhausted",
      "msg": "Merkle tree capacity exhausted"
    },
    {
      "code": 6038,
      "name": "stakeAlreadyInitialized",
      "msg": "Pool stake account is already initialized as a Solana stake account"
    },
    {
      "code": 6039,
      "name": "stakeNotInitialized",
      "msg": "Pool stake account has not been initialized yet — call initialize_pool_stake first"
    },
    {
      "code": 6040,
      "name": "stakeAlreadyDelegated",
      "msg": "Pool stake account is already delegated"
    },
    {
      "code": 6041,
      "name": "stakeNotDelegated",
      "msg": "Pool stake account is not delegated"
    },
    {
      "code": 6042,
      "name": "stakeStillActive",
      "msg": "Pool stake account still has active delegation — deactivate first"
    },
    {
      "code": 6043,
      "name": "insufficientStakeFunds",
      "msg": "Pool stake account has insufficient lamports to cover rent and minimum delegation"
    },
    {
      "code": 6044,
      "name": "invalidAccountPairs",
      "msg": "Remaining accounts must be alternating (ValidatorEntry, PoolStake) pairs"
    },
    {
      "code": 6045,
      "name": "stakeAccountMismatch",
      "msg": "Pool stake account does not match the validator entry's registered stake account"
    },
    {
      "code": 6046,
      "name": "invalidValidatorEntry",
      "msg": "Validator entry account is not owned by this program"
    },
    {
      "code": 6047,
      "name": "identityInactive",
      "msg": "Vow identity has no active stake — call recommit to re-activate"
    },
    {
      "code": 6048,
      "name": "identityAlreadyActive",
      "msg": "Vow identity already has an active stake position — unstake first"
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
      "name": "idNftMatured",
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
      "name": "idNftMinted",
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
      "name": "idNftStakeActivated",
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
      "name": "idNftState",
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
      "name": "idNftUnstakeBegun",
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
      "name": "idNftUnstaked",
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
      "name": "poolRebalanced",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "epoch",
            "type": "u64"
          },
          {
            "name": "validatorCount",
            "type": "u8"
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
            "name": "paused",
            "type": "bool"
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
            "name": "creditsWeight",
            "type": "u32"
          },
          {
            "name": "selfStakeWeight",
            "type": "u32"
          },
          {
            "name": "selfStakeCeil",
            "type": "u64"
          },
          {
            "name": "skipPenalty",
            "type": "u32"
          },
          {
            "name": "commissionPenalty",
            "type": "u32"
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
      "name": "rebalanceTargetsSet",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "epoch",
            "type": "u64"
          },
          {
            "name": "validatorCount",
            "type": "u8"
          },
          {
            "name": "totalPoolLamports",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "scoringWeights",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creditsWeight",
            "type": "u32"
          },
          {
            "name": "selfStakeWeight",
            "type": "u32"
          },
          {
            "name": "selfStakeCeil",
            "type": "u64"
          },
          {
            "name": "skipPenalty",
            "type": "u32"
          },
          {
            "name": "commissionPenalty",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "sessionAccount",
      "docs": [
        "A session key authorization account. The PDA is derived from",
        "[b\"session\", idnft_state, session_index_le4] so it can be recovered",
        "deterministically from any device that knows the owner's wallet seed.",
        "",
        "session_index is user-chosen (0, 1, 2, …) and maps to a human label",
        "(\"Trading Bot\", \"Arena Game\", \"Mobile\") that wallets can display.",
        "The wallet derives the session keypair from the owner seed + index",
        "using a standard derivation path — no private-key export needed."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "idnftState",
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
              "Deterministic index chosen by the user. PDA seed uses this instead of",
              "session_key so wallets can recover all sessions from the seed phrase alone."
            ],
            "type": "u32"
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
            "name": "idnftState",
            "type": "pubkey"
          },
          {
            "name": "sessionKey",
            "type": "pubkey"
          },
          {
            "name": "expiryTs",
            "type": "i64"
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
            "name": "idnftState",
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
      "name": "stakeDeactivated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "voteAccount",
            "type": "pubkey"
          },
          {
            "name": "poolStake",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "stakeDelegated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "voteAccount",
            "type": "pubkey"
          },
          {
            "name": "poolStake",
            "type": "pubkey"
          },
          {
            "name": "lamports",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "stakeInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "voteAccount",
            "type": "pubkey"
          },
          {
            "name": "poolStake",
            "type": "pubkey"
          },
          {
            "name": "lamports",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "stakePool",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "activeValidatorCount",
            "type": "u8"
          },
          {
            "name": "maxValidators",
            "type": "u8"
          },
          {
            "name": "maxValidatorPctBps",
            "type": "u16"
          },
          {
            "name": "lastRebalanceEpoch",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "reserveBump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "stakeWithdrawn",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "voteAccount",
            "type": "pubkey"
          },
          {
            "name": "poolStake",
            "type": "pubkey"
          },
          {
            "name": "lamports",
            "type": "u64"
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
            "name": "idnftState",
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
      "name": "validatorAdded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "voteAccount",
            "type": "pubkey"
          },
          {
            "name": "stakeAccount",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "validatorEntry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "voteAccount",
            "type": "pubkey"
          },
          {
            "name": "stakeAccount",
            "type": "pubkey"
          },
          {
            "name": "allocatedLamports",
            "type": "u64"
          },
          {
            "name": "score",
            "type": "u32"
          },
          {
            "name": "lastScoredEpoch",
            "type": "u64"
          },
          {
            "name": "active",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "stakeBump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "validatorScored",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "voteAccount",
            "type": "pubkey"
          },
          {
            "name": "score",
            "type": "u32"
          },
          {
            "name": "epoch",
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
