/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/monthly.json`.
 */
export type Monthly = {
  "address": "6F6a5BMjLyy7rXRcgZf9vwSqsVxJ34d1Xvov4gBsMhcQ",
  "metadata": {
    "name": "monthly",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Recurring payments on Solana via token delegation"
  },
  "instructions": [
    {
      "name": "acceptPrice",
      "discriminator": [
        110,
        25,
        28,
        175,
        22,
        221,
        155,
        107
      ],
      "accounts": [
        {
          "name": "subscriber",
          "signer": true,
          "relations": [
            "subscription"
          ]
        },
        {
          "name": "plan",
          "relations": [
            "subscription"
          ]
        },
        {
          "name": "subscription",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  98,
                  115,
                  99,
                  114,
                  105,
                  112,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "plan"
              },
              {
                "kind": "account",
                "path": "subscriber"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "expectedAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "cancel",
      "discriminator": [
        232,
        219,
        223,
        41,
        219,
        236,
        220,
        190
      ],
      "accounts": [
        {
          "name": "subscriber",
          "writable": true,
          "signer": true,
          "relations": [
            "subscription"
          ]
        },
        {
          "name": "plan",
          "writable": true,
          "relations": [
            "subscription"
          ]
        },
        {
          "name": "subscription",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  98,
                  115,
                  99,
                  114,
                  105,
                  112,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "plan"
              },
              {
                "kind": "account",
                "path": "subscriber"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "charge",
      "discriminator": [
        26,
        55,
        197,
        209,
        93,
        77,
        242,
        15
      ],
      "accounts": [
        {
          "name": "payer",
          "docs": [
            "Anyone may trigger a due charge; they only pay the transaction fee."
          ],
          "signer": true
        },
        {
          "name": "plan",
          "writable": true,
          "relations": [
            "subscription"
          ]
        },
        {
          "name": "subscription",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  98,
                  115,
                  99,
                  114,
                  105,
                  112,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "plan"
              },
              {
                "kind": "account",
                "path": "subscription.subscriber",
                "account": "subscription"
              }
            ]
          }
        },
        {
          "name": "subscriberTokenAccount",
          "writable": true
        },
        {
          "name": "merchantTokenAccount",
          "writable": true
        },
        {
          "name": "authority",
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
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "closePlan",
      "discriminator": [
        45,
        137,
        184,
        220,
        162,
        253,
        161,
        8
      ],
      "accounts": [
        {
          "name": "merchant",
          "signer": true,
          "relations": [
            "plan"
          ]
        },
        {
          "name": "plan",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "createPlan",
      "discriminator": [
        77,
        43,
        141,
        254,
        212,
        118,
        41,
        186
      ],
      "accounts": [
        {
          "name": "merchant",
          "writable": true,
          "signer": true
        },
        {
          "name": "plan",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "merchant"
              },
              {
                "kind": "arg",
                "path": "planId"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "merchantTokenAccount"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "planId",
          "type": "u64"
        },
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "image",
          "type": "string"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "intervalSeconds",
          "type": "i64"
        }
      ]
    },
    {
      "name": "deletePlan",
      "discriminator": [
        41,
        111,
        169,
        210,
        93,
        141,
        108,
        53
      ],
      "accounts": [
        {
          "name": "merchant",
          "writable": true,
          "signer": true,
          "relations": [
            "plan"
          ]
        },
        {
          "name": "plan",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "resume",
      "discriminator": [
        1,
        166,
        51,
        170,
        127,
        32,
        141,
        206
      ],
      "accounts": [
        {
          "name": "subscriber",
          "signer": true,
          "relations": [
            "subscription"
          ]
        },
        {
          "name": "plan",
          "writable": true,
          "relations": [
            "subscription"
          ]
        },
        {
          "name": "subscription",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  98,
                  115,
                  99,
                  114,
                  105,
                  112,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "plan"
              },
              {
                "kind": "account",
                "path": "subscriber"
              }
            ]
          }
        },
        {
          "name": "subscriberTokenAccount",
          "writable": true
        },
        {
          "name": "merchantTokenAccount",
          "writable": true
        },
        {
          "name": "authority",
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
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "subscribe",
      "discriminator": [
        254,
        28,
        191,
        138,
        156,
        179,
        183,
        53
      ],
      "accounts": [
        {
          "name": "subscriber",
          "writable": true,
          "signer": true
        },
        {
          "name": "plan",
          "writable": true
        },
        {
          "name": "subscription",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  98,
                  115,
                  99,
                  114,
                  105,
                  112,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "plan"
              },
              {
                "kind": "account",
                "path": "subscriber"
              }
            ]
          }
        },
        {
          "name": "subscriberTokenAccount",
          "writable": true
        },
        {
          "name": "merchantTokenAccount",
          "writable": true
        },
        {
          "name": "authority",
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
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "expectedAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "updatePlan",
      "discriminator": [
        119,
        112,
        58,
        60,
        76,
        205,
        1,
        100
      ],
      "accounts": [
        {
          "name": "merchant",
          "signer": true,
          "relations": [
            "plan"
          ]
        },
        {
          "name": "plan",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "image",
          "type": "string"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "plan",
      "discriminator": [
        161,
        231,
        251,
        119,
        2,
        12,
        162,
        2
      ]
    },
    {
      "name": "subscription",
      "discriminator": [
        64,
        7,
        26,
        135,
        102,
        132,
        98,
        33
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "zeroAmount",
      "msg": "Amount must be greater than zero"
    },
    {
      "code": 6001,
      "name": "intervalTooShort",
      "msg": "Interval is shorter than the allowed minimum"
    },
    {
      "code": 6002,
      "name": "nameTooLong",
      "msg": "Plan name is too long"
    },
    {
      "code": 6003,
      "name": "planClosed",
      "msg": "Plan is closed"
    },
    {
      "code": 6004,
      "name": "notActive",
      "msg": "Subscription is not active"
    },
    {
      "code": 6005,
      "name": "notPaused",
      "msg": "Subscription is not paused"
    },
    {
      "code": 6006,
      "name": "notDue",
      "msg": "Subscription is not due yet"
    },
    {
      "code": 6007,
      "name": "mandateMissing",
      "msg": "Subscriber has not approved the Monthly authority as delegate"
    },
    {
      "code": 6008,
      "name": "mandateExhausted",
      "msg": "Delegated allowance is smaller than the plan amount"
    },
    {
      "code": 6009,
      "name": "insufficientFunds",
      "msg": "Subscriber token balance is smaller than the plan amount"
    },
    {
      "code": 6010,
      "name": "retryLater",
      "msg": "Charge failed and the grace period has not ended yet; retry later"
    },
    {
      "code": 6011,
      "name": "tokenAccountMismatch",
      "msg": "Token account does not match the plan"
    },
    {
      "code": 6012,
      "name": "imageTooLong",
      "msg": "Image reference is too long"
    },
    {
      "code": 6013,
      "name": "nothingToAccept",
      "msg": "Plan price is not higher than the price you agreed to"
    },
    {
      "code": 6014,
      "name": "planHasMembers",
      "msg": "Plan still has members; they must cancel before it can be deleted"
    },
    {
      "code": 6015,
      "name": "priceChanged",
      "msg": "The plan price changed; review the new price and sign again"
    },
    {
      "code": 6016,
      "name": "intervalTooLong",
      "msg": "Interval is longer than the allowed maximum"
    }
  ],
  "types": [
    {
      "name": "plan",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "merchant",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "merchantTokenAccount",
            "docs": [
              "Token account that receives every charge. Fixed at creation."
            ],
            "type": "pubkey"
          },
          {
            "name": "amount",
            "docs": [
              "Current price per period, in the mint's base units. New subscribers agree to this price.",
              "Existing subscribers are charged min(their agreed price, this price)."
            ],
            "type": "u64"
          },
          {
            "name": "intervalSeconds",
            "type": "i64"
          },
          {
            "name": "planId",
            "docs": [
              "Merchant-chosen id, part of the PDA seed so one merchant can run several plans."
            ],
            "type": "u64"
          },
          {
            "name": "active",
            "type": "bool"
          },
          {
            "name": "subscriberCount",
            "type": "u64"
          },
          {
            "name": "totalCollected",
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "image",
            "type": "string"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "subscription",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "subscriber",
            "type": "pubkey"
          },
          {
            "name": "plan",
            "type": "pubkey"
          },
          {
            "name": "subscriberTokenAccount",
            "docs": [
              "Token account the charges are pulled from. Fixed at subscription."
            ],
            "type": "pubkey"
          },
          {
            "name": "agreedAmount",
            "docs": [
              "Price the subscriber signed for. A higher plan price only applies after `accept_price`."
            ],
            "type": "u64"
          },
          {
            "name": "nextChargeAt",
            "type": "i64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "subscriptionStatus"
              }
            }
          },
          {
            "name": "periodsPaid",
            "type": "u64"
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
      "name": "subscriptionStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "active"
          },
          {
            "name": "paused"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "authoritySeed",
      "docs": [
        "Seed of the program-owned delegate that subscribers approve on their token account."
      ],
      "type": "bytes",
      "value": "[97, 117, 116, 104, 111, 114, 105, 116, 121]"
    },
    {
      "name": "graceSeconds",
      "docs": [
        "Time after the due date during which a failed charge is retried before the subscription is paused."
      ],
      "type": "i64",
      "value": "259200"
    },
    {
      "name": "maxIntervalSeconds",
      "docs": [
        "Longest allowed billing interval (one year plus a day)."
      ],
      "type": "i64",
      "value": "31622400"
    },
    {
      "name": "minIntervalSeconds",
      "docs": [
        "Shortest allowed billing interval. Short intervals exist so a judge can watch a charge happen live."
      ],
      "type": "i64",
      "value": "60"
    },
    {
      "name": "planSeed",
      "type": "bytes",
      "value": "[112, 108, 97, 110]"
    },
    {
      "name": "subscriptionSeed",
      "type": "bytes",
      "value": "[115, 117, 98, 115, 99, 114, 105, 112, 116, 105, 111, 110]"
    }
  ]
};
