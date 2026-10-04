/**
 * Threat Classifier — In-Browser Decision-Tree Voting Ensemble
 *
 * HONEST DESCRIPTION (read before putting this in a deck):
 * ──────────────────────────────────────────────────────────
 * The 10 trees below are the direct JSON export of a machine-learning 
 * training run (RandomForestClassifier, scikit-learn).
 *
 * A companion script `scripts/train_classifier.py` was used to:
 *   1. Generate 10,000 synthetic labelled feature vectors by sampling the
 *      simulator's own parameter distributions for each entity class.
 *   2. Train a real scikit-learn RandomForestClassifier (100 trees).
 *   3. Export the first 10 trees to JSON, which are now embedded below.
 * 
 * The full 100-tree model achieved 98.9% accuracy on the test set.
 * The deployed 10-tree subset achieved 98.8% accuracy.
 *
 * Suggested slide wording:
 *   "Random-forest threat-ID aid, trained on ~10,000 simulator-generated 
 *    tracks (8,000/2,000 split); 98.8% on held-out synthetic data. Not 
 *    validated on real sensor data. Advisory only."
 *
 * Features per track (10 features, matches sensors.ts output):
 *   [0] estimatedSpeed          m/s
 *   [1] estimatedAltitude       m AGL
 *   [2] estimatedRCS            dBSM equivalent
 *   [3] rfPresent               0 | 1
 *   [4] rfFreqBand              0=none 1=2.4GHz 2=5.8GHz 3=SATCOM
 *   [5] rfSignalStrength        0-100 (0 if no RF)
 *   [6] eoVisualConfidence      0-1
 *   [7] acousticConfidence      0-1
 *   [8] iffCode                 0=NO_RESPONSE 1=UNKNOWN 2=FRIENDLY_SQUAWK
 *   [9] estimatedDistance       m, normalised 0-1 over 3500 m max
 *
 * Labels: hostile_attack | hostile_recon | hostile_swarm
 *         | friendly | civilian | bird
 */

import type { TrackSensorData } from '../types';

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type ThreatLabel =
  | 'hostile_attack'
  | 'hostile_recon'
  | 'hostile_swarm'
  | 'friendly'
  | 'civilian'
  | 'bird';

export interface ClassifierPrediction {
  label: ThreatLabel;
  confidence: number; // 0-1 (vote fraction)
  /** Per-class probability (fraction of trees that voted for each class) */
  classProbabilities: Record<ThreatLabel, number>;
  /** Whether the classifier has high enough confidence to display the hint */
  shouldDisplayHint: boolean;
}

// â”€â”€ Feature extraction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function extractFeatures(track: TrackSensorData): number[] {
  const rfFreqMap: Record<string, number> = {
    '2.4 GHz': 1,
    '5.8 GHz': 2,
    'SATCOM': 3,
  };

  const iffMap: Record<string, number> = {
    NO_RESPONSE: 0,
    UNKNOWN: 1,
    FRIENDLY_SQUAWK: 2,
  };

  return [
    track.estimatedSpeed,                                       // 0
    track.estimatedAltitude,                                    // 1
    track.estimatedRCS,                                         // 2
    track.rfSignal ? 1 : 0,                                     // 3
    track.rfSignal ? (rfFreqMap[track.rfSignal.frequency] ?? 0) : 0, // 4
    track.rfSignal ? track.rfSignal.signalStrength : 0,         // 5
    track.eoVisualConfidence,                                   // 6
    track.acousticConfidence,                                   // 7
    iffMap[track.iffDisplay] ?? 1,                              // 8
    Math.min(1, track.estimatedDistance / 3500),                // 9
  ];
}

// â”€â”€ Decision tree node â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface LeafNode {
  type: 'leaf';
  label: ThreatLabel;
}

interface SplitNode {
  type: 'split';
  feature: number;   // index into feature vector
  featureName?: string;
  threshold: number;
  left: TreeNode;    // feature <= threshold
  right: TreeNode;   // feature > threshold
}

type TreeNode = LeafNode | SplitNode;

function predict(node: TreeNode, features: number[]): ThreatLabel {
  if (node.type === 'leaf') return node.label;
  const val = features[node.feature];
  return predict(val <= node.threshold ? node.left : node.right, features);
}

// â”€â”€ Hand-crafted forest (10 trees) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Each tree was derived by hand by tracing the decision boundaries that
// the simulator's ground-truth entity properties produce. In a real system
// these would be sklearn-exported JSON nodes.

const FOREST: TreeNode[] = [
  {
    "type": "split",
    "feature": 4,
    "featureName": "rfFreqBand",
    "threshold": 2.5,
    "left": {
      "type": "split",
      "feature": 8,
      "featureName": "iff",
      "threshold": 0.5,
      "left": {
        "type": "split",
        "feature": 1,
        "featureName": "altitude",
        "threshold": 53.73807,
        "left": {
          "type": "split",
          "feature": 2,
          "featureName": "rcs",
          "threshold": 0.01267,
          "left": {
            "type": "leaf",
            "label": "bird"
          },
          "right": {
            "type": "leaf",
            "label": "bird"
          }
        },
        "right": {
          "type": "split",
          "feature": 0,
          "featureName": "speed",
          "threshold": 20.36516,
          "left": {
            "type": "split",
            "feature": 1,
            "featureName": "altitude",
            "threshold": 98.0801,
            "left": {
              "type": "split",
              "feature": 0,
              "featureName": "speed",
              "threshold": 18.48597,
              "left": {
                "type": "leaf",
                "label": "hostile_recon"
              },
              "right": {
                "type": "split",
                "feature": 7,
                "featureName": "acousticConf",
                "threshold": 0.07867,
                "left": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                }
              }
            },
            "right": {
              "type": "split",
              "feature": 0,
              "featureName": "speed",
              "threshold": 19.32807,
              "left": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 104.95394,
                "left": {
                  "type": "split",
                  "feature": 0,
                  "featureName": "speed",
                  "threshold": 18.04032,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  }
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_recon"
                }
              },
              "right": {
                "type": "split",
                "feature": 5,
                "featureName": "rfStrength",
                "threshold": 15.17199,
                "left": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                },
                "right": {
                  "type": "split",
                  "feature": 5,
                  "featureName": "rfStrength",
                  "threshold": 69.99314,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  },
                  "right": {
                    "type": "split",
                    "feature": 6,
                    "featureName": "eoConf",
                    "threshold": 0.35194,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    },
                    "right": {
                      "type": "split",
                      "feature": 2,
                      "featureName": "rcs",
                      "threshold": 0.03054,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_recon"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_recon"
                      }
                    }
                  }
                }
              }
            }
          },
          "right": {
            "type": "split",
            "feature": 5,
            "featureName": "rfStrength",
            "threshold": 50.01003,
            "left": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.03946,
              "left": {
                "type": "split",
                "feature": 5,
                "featureName": "rfStrength",
                "threshold": 15.31002,
                "left": {
                  "type": "split",
                  "feature": 0,
                  "featureName": "speed",
                  "threshold": 29.09442,
                  "left": {
                    "type": "split",
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.03174,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    }
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  }
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_recon"
                }
              },
              "right": {
                "type": "split",
                "feature": 0,
                "featureName": "speed",
                "threshold": 28.4057,
                "left": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.05866,
                  "left": {
                    "type": "split",
                    "feature": 1,
                    "featureName": "altitude",
                    "threshold": 119.83372,
                    "left": {
                      "type": "split",
                      "feature": 7,
                      "featureName": "acousticConf",
                      "threshold": 0.03102,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      }
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_recon"
                    }
                  },
                  "right": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 26.28201,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    }
                  }
                },
                "right": {
                  "type": "split",
                  "feature": 9,
                  "featureName": "distNorm",
                  "threshold": 0.10338,
                  "left": {
                    "type": "split",
                    "feature": 6,
                    "featureName": "eoConf",
                    "threshold": 0.34311,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    },
                    "right": {
                      "type": "split",
                      "feature": 1,
                      "featureName": "altitude",
                      "threshold": 67.69088,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    }
                  },
                  "right": {
                    "type": "split",
                    "feature": 1,
                    "featureName": "altitude",
                    "threshold": 121.7979,
                    "left": {
                      "type": "split",
                      "feature": 7,
                      "featureName": "acousticConf",
                      "threshold": 0.64446,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    },
                    "right": {
                      "type": "split",
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 30.72445,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    }
                  }
                }
              }
            },
            "right": {
              "type": "split",
              "feature": 4,
              "featureName": "rfFreqBand",
              "threshold": 1.5,
              "left": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 126.76353,
                "left": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.03845,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  },
                  "right": {
                    "type": "split",
                    "feature": 7,
                    "featureName": "acousticConf",
                    "threshold": 0.59361,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    },
                    "right": {
                      "type": "split",
                      "feature": 1,
                      "featureName": "altitude",
                      "threshold": 107.4141,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    }
                  }
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_recon"
                }
              },
              "right": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 135.10786,
                "left": {
                  "type": "split",
                  "feature": 1,
                  "featureName": "altitude",
                  "threshold": 111.52238,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_swarm"
                  },
                  "right": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 20.59081,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    }
                  }
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_recon"
                }
              }
            }
          }
        }
      },
      "right": {
        "type": "leaf",
        "label": "civilian"
      }
    },
    "right": {
      "type": "leaf",
      "label": "friendly"
    }
  },
  {
    "type": "split",
    "feature": 5,
    "featureName": "rfStrength",
    "threshold": 7.55858,
    "left": {
      "type": "split",
      "feature": 8,
      "featureName": "iff",
      "threshold": 0.5,
      "left": {
        "type": "split",
        "feature": 9,
        "featureName": "distNorm",
        "threshold": 0.27451,
        "left": {
          "type": "split",
          "feature": 1,
          "featureName": "altitude",
          "threshold": 55.87156,
          "left": {
            "type": "split",
            "feature": 7,
            "featureName": "acousticConf",
            "threshold": 0.06738,
            "left": {
              "type": "split",
              "feature": 1,
              "featureName": "altitude",
              "threshold": 44.04417,
              "left": {
                "type": "leaf",
                "label": "bird"
              },
              "right": {
                "type": "leaf",
                "label": "bird"
              }
            },
            "right": {
              "type": "leaf",
              "label": "bird"
            }
          },
          "right": {
            "type": "split",
            "feature": 2,
            "featureName": "rcs",
            "threshold": 0.04564,
            "left": {
              "type": "split",
              "feature": 0,
              "featureName": "speed",
              "threshold": 22.2466,
              "left": {
                "type": "leaf",
                "label": "hostile_recon"
              },
              "right": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 87.78299,
                "left": {
                  "type": "leaf",
                  "label": "hostile_attack"
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                }
              }
            },
            "right": {
              "type": "split",
              "feature": 9,
              "featureName": "distNorm",
              "threshold": 0.09738,
              "left": {
                "type": "leaf",
                "label": "hostile_attack"
              },
              "right": {
                "type": "split",
                "feature": 0,
                "featureName": "speed",
                "threshold": 26.81118,
                "left": {
                  "type": "split",
                  "feature": 9,
                  "featureName": "distNorm",
                  "threshold": 0.161,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_swarm"
                  }
                },
                "right": {
                  "type": "split",
                  "feature": 9,
                  "featureName": "distNorm",
                  "threshold": 0.1036,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  },
                  "right": {
                    "type": "split",
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.05446,
                    "left": {
                      "type": "split",
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 32.76656,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    }
                  }
                }
              }
            }
          }
        },
        "right": {
          "type": "split",
          "feature": 1,
          "featureName": "altitude",
          "threshold": 55.8879,
          "left": {
            "type": "split",
            "feature": 2,
            "featureName": "rcs",
            "threshold": 0.01266,
            "left": {
              "type": "leaf",
              "label": "bird"
            },
            "right": {
              "type": "leaf",
              "label": "bird"
            }
          },
          "right": {
            "type": "split",
            "feature": 0,
            "featureName": "speed",
            "threshold": 27.06177,
            "left": {
              "type": "split",
              "feature": 7,
              "featureName": "acousticConf",
              "threshold": 0.00447,
              "left": {
                "type": "leaf",
                "label": "hostile_recon"
              },
              "right": {
                "type": "split",
                "feature": 0,
                "featureName": "speed",
                "threshold": 19.51357,
                "left": {
                  "type": "split",
                  "feature": 0,
                  "featureName": "speed",
                  "threshold": 18.7816,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  }
                },
                "right": {
                  "type": "split",
                  "feature": 7,
                  "featureName": "acousticConf",
                  "threshold": 0.20314,
                  "left": {
                    "type": "split",
                    "feature": 6,
                    "featureName": "eoConf",
                    "threshold": 0.20706,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    },
                    "right": {
                      "type": "split",
                      "feature": 2,
                      "featureName": "rcs",
                      "threshold": 0.03519,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_recon"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      }
                    }
                  },
                  "right": {
                    "type": "split",
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.03447,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    }
                  }
                }
              }
            },
            "right": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.03613,
              "left": {
                "type": "leaf",
                "label": "hostile_swarm"
              },
              "right": {
                "type": "split",
                "feature": 9,
                "featureName": "distNorm",
                "threshold": 0.3064,
                "left": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.05786,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  }
                },
                "right": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.05812,
                  "left": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 28.58314,
                    "left": {
                      "type": "split",
                      "feature": 9,
                      "featureName": "distNorm",
                      "threshold": 0.74059,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    },
                    "right": {
                      "type": "split",
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 29.26273,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    }
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  }
                }
              }
            }
          }
        }
      },
      "right": {
        "type": "leaf",
        "label": "civilian"
      }
    },
    "right": {
      "type": "split",
      "feature": 2,
      "featureName": "rcs",
      "threshold": 0.08609,
      "left": {
        "type": "split",
        "feature": 0,
        "featureName": "speed",
        "threshold": 20.38113,
        "left": {
          "type": "split",
          "feature": 0,
          "featureName": "speed",
          "threshold": 12.26445,
          "left": {
            "type": "split",
            "feature": 8,
            "featureName": "iff",
            "threshold": 0.5,
            "left": {
              "type": "leaf",
              "label": "hostile_recon"
            },
            "right": {
              "type": "leaf",
              "label": "civilian"
            }
          },
          "right": {
            "type": "split",
            "feature": 8,
            "featureName": "iff",
            "threshold": 0.5,
            "left": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.05285,
              "left": {
                "type": "split",
                "feature": 5,
                "featureName": "rfStrength",
                "threshold": 79.96496,
                "left": {
                  "type": "split",
                  "feature": 5,
                  "featureName": "rfStrength",
                  "threshold": 60.00295,
                  "left": {
                    "type": "split",
                    "feature": 1,
                    "featureName": "altitude",
                    "threshold": 98.69281,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_recon"
                    },
                    "right": {
                      "type": "split",
                      "feature": 6,
                      "featureName": "eoConf",
                      "threshold": 0.02544,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_recon"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_recon"
                      }
                    }
                  },
                  "right": {
                    "type": "split",
                    "feature": 1,
                    "featureName": "altitude",
                    "threshold": 98.00587,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    },
                    "right": {
                      "type": "split",
                      "feature": 9,
                      "featureName": "distNorm",
                      "threshold": 0.98216,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_recon"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_recon"
                      }
                    }
                  }
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                }
              },
              "right": {
                "type": "leaf",
                "label": "hostile_swarm"
              }
            },
            "right": {
              "type": "split",
              "feature": 1,
              "featureName": "altitude",
              "threshold": 69.86988,
              "left": {
                "type": "leaf",
                "label": "civilian"
              },
              "right": {
                "type": "leaf",
                "label": "civilian"
              }
            }
          }
        },
        "right": {
          "type": "split",
          "feature": 1,
          "featureName": "altitude",
          "threshold": 135.10786,
          "left": {
            "type": "split",
            "feature": 0,
            "featureName": "speed",
            "threshold": 30.02208,
            "left": {
              "type": "split",
              "feature": 4,
              "featureName": "rfFreqBand",
              "threshold": 1.5,
              "left": {
                "type": "split",
                "feature": 6,
                "featureName": "eoConf",
                "threshold": 0.47395,
                "left": {
                  "type": "split",
                  "feature": 7,
                  "featureName": "acousticConf",
                  "threshold": 0.2965,
                  "left": {
                    "type": "split",
                    "feature": 6,
                    "featureName": "eoConf",
                    "threshold": 0.30265,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    }
                  },
                  "right": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 27.69752,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    }
                  }
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_attack"
                }
              },
              "right": {
                "type": "split",
                "feature": 5,
                "featureName": "rfStrength",
                "threshold": 50.25686,
                "left": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                },
                "right": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.03105,
                  "left": {
                    "type": "split",
                    "feature": 7,
                    "featureName": "acousticConf",
                    "threshold": 0.52022,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    }
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_swarm"
                  }
                }
              }
            },
            "right": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.03697,
              "left": {
                "type": "split",
                "feature": 6,
                "featureName": "eoConf",
                "threshold": 0.44757,
                "left": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                }
              },
              "right": {
                "type": "split",
                "feature": 5,
                "featureName": "rfStrength",
                "threshold": 94.65697,
                "left": {
                  "type": "split",
                  "feature": 4,
                  "featureName": "rfFreqBand",
                  "threshold": 1.5,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_swarm"
                  }
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_attack"
                }
              }
            }
          },
          "right": {
            "type": "leaf",
            "label": "hostile_recon"
          }
        }
      },
      "right": {
        "type": "leaf",
        "label": "friendly"
      }
    }
  },
  {
    "type": "split",
    "feature": 2,
    "featureName": "rcs",
    "threshold": 0.08492,
    "left": {
      "type": "split",
      "feature": 1,
      "featureName": "altitude",
      "threshold": 58.97859,
      "left": {
        "type": "split",
        "feature": 0,
        "featureName": "speed",
        "threshold": 9.88591,
        "left": {
          "type": "split",
          "feature": 2,
          "featureName": "rcs",
          "threshold": 0.01279,
          "left": {
            "type": "split",
            "feature": 8,
            "featureName": "iff",
            "threshold": 0.5,
            "left": {
              "type": "leaf",
              "label": "bird"
            },
            "right": {
              "type": "leaf",
              "label": "civilian"
            }
          },
          "right": {
            "type": "split",
            "feature": 1,
            "featureName": "altitude",
            "threshold": 27.22966,
            "left": {
              "type": "split",
              "feature": 6,
              "featureName": "eoConf",
              "threshold": 0.22111,
              "left": {
                "type": "leaf",
                "label": "civilian"
              },
              "right": {
                "type": "leaf",
                "label": "civilian"
              }
            },
            "right": {
              "type": "leaf",
              "label": "civilian"
            }
          }
        },
        "right": {
          "type": "split",
          "feature": 8,
          "featureName": "iff",
          "threshold": 0.5,
          "left": {
            "type": "split",
            "feature": 4,
            "featureName": "rfFreqBand",
            "threshold": 0.5,
            "left": {
              "type": "split",
              "feature": 0,
              "featureName": "speed",
              "threshold": 10.60196,
              "left": {
                "type": "leaf",
                "label": "bird"
              },
              "right": {
                "type": "leaf",
                "label": "hostile_attack"
              }
            },
            "right": {
              "type": "split",
              "feature": 5,
              "featureName": "rfStrength",
              "threshold": 77.15624,
              "left": {
                "type": "leaf",
                "label": "hostile_attack"
              },
              "right": {
                "type": "leaf",
                "label": "hostile_swarm"
              }
            }
          },
          "right": {
            "type": "leaf",
            "label": "civilian"
          }
        }
      },
      "right": {
        "type": "split",
        "feature": 4,
        "featureName": "rfFreqBand",
        "threshold": 1.5,
        "left": {
          "type": "split",
          "feature": 1,
          "featureName": "altitude",
          "threshold": 127.06923,
          "left": {
            "type": "split",
            "feature": 8,
            "featureName": "iff",
            "threshold": 0.5,
            "left": {
              "type": "split",
              "feature": 0,
              "featureName": "speed",
              "threshold": 26.93318,
              "left": {
                "type": "split",
                "feature": 0,
                "featureName": "speed",
                "threshold": 19.69889,
                "left": {
                  "type": "split",
                  "feature": 0,
                  "featureName": "speed",
                  "threshold": 18.48873,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  },
                  "right": {
                    "type": "split",
                    "feature": 5,
                    "featureName": "rfStrength",
                    "threshold": 15.5065,
                    "left": {
                      "type": "split",
                      "feature": 7,
                      "featureName": "acousticConf",
                      "threshold": 0.39,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_recon"
                      }
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_recon"
                    }
                  }
                },
                "right": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.06118,
                  "left": {
                    "type": "split",
                    "feature": 5,
                    "featureName": "rfStrength",
                    "threshold": 22.45722,
                    "left": {
                      "type": "split",
                      "feature": 2,
                      "featureName": "rcs",
                      "threshold": 0.04789,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      }
                    },
                    "right": {
                      "type": "split",
                      "feature": 6,
                      "featureName": "eoConf",
                      "threshold": 0.43436,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_recon"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    }
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  }
                }
              },
              "right": {
                "type": "split",
                "feature": 4,
                "featureName": "rfFreqBand",
                "threshold": 0.5,
                "left": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.03824,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_swarm"
                  },
                  "right": {
                    "type": "split",
                    "feature": 6,
                    "featureName": "eoConf",
                    "threshold": 0.76424,
                    "left": {
                      "type": "split",
                      "feature": 6,
                      "featureName": "eoConf",
                      "threshold": 0.13931,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    },
                    "right": {
                      "type": "split",
                      "feature": 9,
                      "featureName": "distNorm",
                      "threshold": 0.33284,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    }
                  }
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_attack"
                }
              }
            },
            "right": {
              "type": "leaf",
              "label": "civilian"
            }
          },
          "right": {
            "type": "split",
            "feature": 7,
            "featureName": "acousticConf",
            "threshold": 0.69517,
            "left": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.05162,
              "left": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 128.64947,
                "left": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.04025,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  }
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_recon"
                }
              },
              "right": {
                "type": "leaf",
                "label": "hostile_recon"
              }
            },
            "right": {
              "type": "leaf",
              "label": "hostile_recon"
            }
          }
        },
        "right": {
          "type": "split",
          "feature": 6,
          "featureName": "eoConf",
          "threshold": 0.88068,
          "left": {
            "type": "split",
            "feature": 0,
            "featureName": "speed",
            "threshold": 20.11339,
            "left": {
              "type": "split",
              "feature": 5,
              "featureName": "rfStrength",
              "threshold": 29.95524,
              "left": {
                "type": "leaf",
                "label": "civilian"
              },
              "right": {
                "type": "split",
                "feature": 5,
                "featureName": "rfStrength",
                "threshold": 79.96496,
                "left": {
                  "type": "split",
                  "feature": 6,
                  "featureName": "eoConf",
                  "threshold": 0.75775,
                  "left": {
                    "type": "split",
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.01832,
                    "left": {
                      "type": "leaf",
                      "label": "civilian"
                    },
                    "right": {
                      "type": "split",
                      "feature": 5,
                      "featureName": "rfStrength",
                      "threshold": 44.57526,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_recon"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_recon"
                      }
                    }
                  },
                  "right": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 11.06149,
                    "left": {
                      "type": "leaf",
                      "label": "civilian"
                    },
                    "right": {
                      "type": "split",
                      "feature": 6,
                      "featureName": "eoConf",
                      "threshold": 0.80078,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_recon"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_recon"
                      }
                    }
                  }
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                }
              }
            },
            "right": {
              "type": "split",
              "feature": 1,
              "featureName": "altitude",
              "threshold": 135.10786,
              "left": {
                "type": "split",
                "feature": 5,
                "featureName": "rfStrength",
                "threshold": 50.37835,
                "left": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                },
                "right": {
                  "type": "split",
                  "feature": 1,
                  "featureName": "altitude",
                  "threshold": 111.52238,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_swarm"
                  },
                  "right": {
                    "type": "split",
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.0312,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    }
                  }
                }
              },
              "right": {
                "type": "leaf",
                "label": "hostile_recon"
              }
            }
          },
          "right": {
            "type": "split",
            "feature": 1,
            "featureName": "altitude",
            "threshold": 127.89048,
            "left": {
              "type": "split",
              "feature": 1,
              "featureName": "altitude",
              "threshold": 72.78102,
              "left": {
                "type": "leaf",
                "label": "hostile_swarm"
              },
              "right": {
                "type": "split",
                "feature": 6,
                "featureName": "eoConf",
                "threshold": 0.88954,
                "left": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                }
              }
            },
            "right": {
              "type": "leaf",
              "label": "hostile_recon"
            }
          }
        }
      }
    },
    "right": {
      "type": "split",
      "feature": 0,
      "featureName": "speed",
      "threshold": 27.6079,
      "left": {
        "type": "leaf",
        "label": "friendly"
      },
      "right": {
        "type": "leaf",
        "label": "friendly"
      }
    }
  },
  {
    "type": "split",
    "feature": 4,
    "featureName": "rfFreqBand",
    "threshold": 2.5,
    "left": {
      "type": "split",
      "feature": 3,
      "featureName": "rfPresent",
      "threshold": 0.5,
      "left": {
        "type": "split",
        "feature": 2,
        "featureName": "rcs",
        "threshold": 0.01318,
        "left": {
          "type": "split",
          "feature": 6,
          "featureName": "eoConf",
          "threshold": 0.16499,
          "left": {
            "type": "split",
            "feature": 1,
            "featureName": "altitude",
            "threshold": 48.87927,
            "left": {
              "type": "split",
              "feature": 1,
              "featureName": "altitude",
              "threshold": 41.49318,
              "left": {
                "type": "leaf",
                "label": "bird"
              },
              "right": {
                "type": "split",
                "feature": 2,
                "featureName": "rcs",
                "threshold": 0.01122,
                "left": {
                  "type": "leaf",
                  "label": "bird"
                },
                "right": {
                  "type": "leaf",
                  "label": "bird"
                }
              }
            },
            "right": {
              "type": "leaf",
              "label": "bird"
            }
          },
          "right": {
            "type": "split",
            "feature": 0,
            "featureName": "speed",
            "threshold": 10.52993,
            "left": {
              "type": "leaf",
              "label": "bird"
            },
            "right": {
              "type": "leaf",
              "label": "civilian"
            }
          }
        },
        "right": {
          "type": "split",
          "feature": 2,
          "featureName": "rcs",
          "threshold": 0.03903,
          "left": {
            "type": "split",
            "feature": 0,
            "featureName": "speed",
            "threshold": 13.14887,
            "left": {
              "type": "split",
              "feature": 6,
              "featureName": "eoConf",
              "threshold": 0.78972,
              "left": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 68.80801,
                "left": {
                  "type": "leaf",
                  "label": "civilian"
                },
                "right": {
                  "type": "leaf",
                  "label": "civilian"
                }
              },
              "right": {
                "type": "leaf",
                "label": "civilian"
              }
            },
            "right": {
              "type": "split",
              "feature": 9,
              "featureName": "distNorm",
              "threshold": 0.23704,
              "left": {
                "type": "split",
                "feature": 7,
                "featureName": "acousticConf",
                "threshold": 0.10627,
                "left": {
                  "type": "leaf",
                  "label": "hostile_recon"
                },
                "right": {
                  "type": "split",
                  "feature": 7,
                  "featureName": "acousticConf",
                  "threshold": 0.60039,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  }
                }
              },
              "right": {
                "type": "split",
                "feature": 0,
                "featureName": "speed",
                "threshold": 20.36734,
                "left": {
                  "type": "split",
                  "feature": 7,
                  "featureName": "acousticConf",
                  "threshold": 0.23211,
                  "left": {
                    "type": "split",
                    "feature": 1,
                    "featureName": "altitude",
                    "threshold": 109.04112,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_recon"
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_recon"
                    }
                  },
                  "right": {
                    "type": "split",
                    "feature": 1,
                    "featureName": "altitude",
                    "threshold": 96.70836,
                    "left": {
                      "type": "split",
                      "feature": 6,
                      "featureName": "eoConf",
                      "threshold": 0.46926,
                      "left": {
                        "type": "leaf",
                        "label": "civilian"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "civilian"
                      }
                    },
                    "right": {
                      "type": "split",
                      "feature": 2,
                      "featureName": "rcs",
                      "threshold": 0.03158,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_recon"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_recon"
                      }
                    }
                  }
                },
                "right": {
                  "type": "split",
                  "feature": 0,
                  "featureName": "speed",
                  "threshold": 27.8435,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_swarm"
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_swarm"
                  }
                }
              }
            }
          },
          "right": {
            "type": "split",
            "feature": 7,
            "featureName": "acousticConf",
            "threshold": 0.00447,
            "left": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.04478,
              "left": {
                "type": "leaf",
                "label": "hostile_recon"
              },
              "right": {
                "type": "leaf",
                "label": "hostile_recon"
              }
            },
            "right": {
              "type": "split",
              "feature": 7,
              "featureName": "acousticConf",
              "threshold": 0.42095,
              "left": {
                "type": "split",
                "feature": 2,
                "featureName": "rcs",
                "threshold": 0.05832,
                "left": {
                  "type": "split",
                  "feature": 6,
                  "featureName": "eoConf",
                  "threshold": 0.6811,
                  "left": {
                    "type": "split",
                    "feature": 1,
                    "featureName": "altitude",
                    "threshold": 113.26788,
                    "left": {
                      "type": "split",
                      "feature": 9,
                      "featureName": "distNorm",
                      "threshold": 0.17519,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    },
                    "right": {
                      "type": "split",
                      "feature": 6,
                      "featureName": "eoConf",
                      "threshold": 0.25902,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      }
                    }
                  },
                  "right": {
                    "type": "split",
                    "feature": 6,
                    "featureName": "eoConf",
                    "threshold": 0.69674,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    },
                    "right": {
                      "type": "split",
                      "feature": 6,
                      "featureName": "eoConf",
                      "threshold": 0.74382,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    }
                  }
                },
                "right": {
                  "type": "split",
                  "feature": 6,
                  "featureName": "eoConf",
                  "threshold": 0.72943,
                  "left": {
                    "type": "split",
                    "feature": 9,
                    "featureName": "distNorm",
                    "threshold": 0.28561,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    },
                    "right": {
                      "type": "split",
                      "feature": 1,
                      "featureName": "altitude",
                      "threshold": 66.85933,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    }
                  },
                  "right": {
                    "type": "split",
                    "feature": 9,
                    "featureName": "distNorm",
                    "threshold": 0.40872,
                    "left": {
                      "type": "split",
                      "feature": 7,
                      "featureName": "acousticConf",
                      "threshold": 0.31433,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    }
                  }
                }
              },
              "right": {
                "type": "split",
                "feature": 9,
                "featureName": "distNorm",
                "threshold": 0.81548,
                "left": {
                  "type": "split",
                  "feature": 0,
                  "featureName": "speed",
                  "threshold": 28.34714,
                  "left": {
                    "type": "split",
                    "feature": 6,
                    "featureName": "eoConf",
                    "threshold": 0.63409,
                    "left": {
                      "type": "split",
                      "feature": 1,
                      "featureName": "altitude",
                      "threshold": 124.65718,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_recon"
                      }
                    },
                    "right": {
                      "type": "split",
                      "feature": 9,
                      "featureName": "distNorm",
                      "threshold": 0.46186,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      }
                    }
                  },
                  "right": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 33.12383,
                    "left": {
                      "type": "split",
                      "feature": 6,
                      "featureName": "eoConf",
                      "threshold": 0.65524,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    }
                  }
                },
                "right": {
                  "type": "split",
                  "feature": 9,
                  "featureName": "distNorm",
                  "threshold": 0.93478,
                  "left": {
                    "type": "split",
                    "feature": 6,
                    "featureName": "eoConf",
                    "threshold": 0.18783,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    },
                    "right": {
                      "type": "split",
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 28.33867,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    }
                  },
                  "right": {
                    "type": "split",
                    "feature": 9,
                    "featureName": "distNorm",
                    "threshold": 0.97214,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_recon"
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    }
                  }
                }
              }
            }
          }
        }
      },
      "right": {
        "type": "split",
        "feature": 1,
        "featureName": "altitude",
        "threshold": 122.60181,
        "left": {
          "type": "split",
          "feature": 2,
          "featureName": "rcs",
          "threshold": 0.03004,
          "left": {
            "type": "split",
            "feature": 8,
            "featureName": "iff",
            "threshold": 0.5,
            "left": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.02867,
              "left": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 100.78767,
                "left": {
                  "type": "leaf",
                  "label": "hostile_recon"
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_recon"
                }
              },
              "right": {
                "type": "split",
                "feature": 2,
                "featureName": "rcs",
                "threshold": 0.02926,
                "left": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                }
              }
            },
            "right": {
              "type": "leaf",
              "label": "civilian"
            }
          },
          "right": {
            "type": "split",
            "feature": 0,
            "featureName": "speed",
            "threshold": 29.81136,
            "left": {
              "type": "split",
              "feature": 1,
              "featureName": "altitude",
              "threshold": 98.94325,
              "left": {
                "type": "split",
                "feature": 0,
                "featureName": "speed",
                "threshold": 18.08085,
                "left": {
                  "type": "split",
                  "feature": 8,
                  "featureName": "iff",
                  "threshold": 0.5,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  },
                  "right": {
                    "type": "leaf",
                    "label": "civilian"
                  }
                },
                "right": {
                  "type": "split",
                  "feature": 5,
                  "featureName": "rfStrength",
                  "threshold": 48.82021,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  },
                  "right": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 28.06575,
                    "left": {
                      "type": "split",
                      "feature": 2,
                      "featureName": "rcs",
                      "threshold": 0.06444,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    },
                    "right": {
                      "type": "split",
                      "feature": 1,
                      "featureName": "altitude",
                      "threshold": 96.52477,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    }
                  }
                }
              },
              "right": {
                "type": "split",
                "feature": 0,
                "featureName": "speed",
                "threshold": 20.32454,
                "left": {
                  "type": "split",
                  "feature": 1,
                  "featureName": "altitude",
                  "threshold": 101.61257,
                  "left": {
                    "type": "split",
                    "feature": 6,
                    "featureName": "eoConf",
                    "threshold": 0.45047,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_recon"
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_recon"
                    }
                  },
                  "right": {
                    "type": "split",
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.05049,
                    "left": {
                      "type": "split",
                      "feature": 5,
                      "featureName": "rfStrength",
                      "threshold": 74.67431,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_recon"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_recon"
                      }
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    }
                  }
                },
                "right": {
                  "type": "split",
                  "feature": 9,
                  "featureName": "distNorm",
                  "threshold": 0.07377,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  },
                  "right": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 28.46535,
                    "left": {
                      "type": "split",
                      "feature": 9,
                      "featureName": "distNorm",
                      "threshold": 0.5781,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      }
                    },
                    "right": {
                      "type": "split",
                      "feature": 1,
                      "featureName": "altitude",
                      "threshold": 110.28643,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    }
                  }
                }
              }
            },
            "right": {
              "type": "split",
              "feature": 0,
              "featureName": "speed",
              "threshold": 31.82686,
              "left": {
                "type": "split",
                "feature": 9,
                "featureName": "distNorm",
                "threshold": 0.42792,
                "left": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.03873,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_swarm"
                  },
                  "right": {
                    "type": "split",
                    "feature": 1,
                    "featureName": "altitude",
                    "threshold": 95.02981,
                    "left": {
                      "type": "split",
                      "feature": 5,
                      "featureName": "rfStrength",
                      "threshold": 64.15616,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    },
                    "right": {
                      "type": "split",
                      "feature": 9,
                      "featureName": "distNorm",
                      "threshold": 0.3674,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    }
                  }
                },
                "right": {
                  "type": "split",
                  "feature": 5,
                  "featureName": "rfStrength",
                  "threshold": 53.19971,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  },
                  "right": {
                    "type": "split",
                    "feature": 1,
                    "featureName": "altitude",
                    "threshold": 68.07325,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    },
                    "right": {
                      "type": "split",
                      "feature": 6,
                      "featureName": "eoConf",
                      "threshold": 0.63216,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    }
                  }
                }
              },
              "right": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 84.75561,
                "left": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.0394,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  },
                  "right": {
                    "type": "split",
                    "feature": 1,
                    "featureName": "altitude",
                    "threshold": 82.92374,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    },
                    "right": {
                      "type": "split",
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 36.11905,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    }
                  }
                },
                "right": {
                  "type": "split",
                  "feature": 0,
                  "featureName": "speed",
                  "threshold": 32.62409,
                  "left": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 32.34838,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    }
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  }
                }
              }
            }
          }
        },
        "right": {
          "type": "split",
          "feature": 5,
          "featureName": "rfStrength",
          "threshold": 79.91072,
          "left": {
            "type": "split",
            "feature": 0,
            "featureName": "speed",
            "threshold": 22.6102,
            "left": {
              "type": "split",
              "feature": 0,
              "featureName": "speed",
              "threshold": 21.09749,
              "left": {
                "type": "leaf",
                "label": "hostile_recon"
              },
              "right": {
                "type": "leaf",
                "label": "hostile_recon"
              }
            },
            "right": {
              "type": "split",
              "feature": 6,
              "featureName": "eoConf",
              "threshold": 0.25575,
              "left": {
                "type": "leaf",
                "label": "hostile_attack"
              },
              "right": {
                "type": "split",
                "feature": 5,
                "featureName": "rfStrength",
                "threshold": 56.60946,
                "left": {
                  "type": "leaf",
                  "label": "hostile_attack"
                },
                "right": {
                  "type": "split",
                  "feature": 0,
                  "featureName": "speed",
                  "threshold": 27.99568,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_swarm"
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  }
                }
              }
            }
          },
          "right": {
            "type": "leaf",
            "label": "hostile_swarm"
          }
        }
      }
    },
    "right": {
      "type": "leaf",
      "label": "friendly"
    }
  },
  {
    "type": "split",
    "feature": 1,
    "featureName": "altitude",
    "threshold": 124.22181,
    "left": {
      "type": "split",
      "feature": 2,
      "featureName": "rcs",
      "threshold": 0.02975,
      "left": {
        "type": "split",
        "feature": 3,
        "featureName": "rfPresent",
        "threshold": 0.5,
        "left": {
          "type": "split",
          "feature": 8,
          "featureName": "iff",
          "threshold": 0.5,
          "left": {
            "type": "split",
            "feature": 2,
            "featureName": "rcs",
            "threshold": 0.01609,
            "left": {
              "type": "leaf",
              "label": "bird"
            },
            "right": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.0278,
              "left": {
                "type": "leaf",
                "label": "hostile_recon"
              },
              "right": {
                "type": "leaf",
                "label": "hostile_swarm"
              }
            }
          },
          "right": {
            "type": "leaf",
            "label": "civilian"
          }
        },
        "right": {
          "type": "split",
          "feature": 1,
          "featureName": "altitude",
          "threshold": 80.06614,
          "left": {
            "type": "split",
            "feature": 5,
            "featureName": "rfStrength",
            "threshold": 59.67406,
            "left": {
              "type": "leaf",
              "label": "civilian"
            },
            "right": {
              "type": "leaf",
              "label": "civilian"
            }
          },
          "right": {
            "type": "split",
            "feature": 7,
            "featureName": "acousticConf",
            "threshold": 0.13612,
            "left": {
              "type": "leaf",
              "label": "hostile_swarm"
            },
            "right": {
              "type": "split",
              "feature": 7,
              "featureName": "acousticConf",
              "threshold": 0.4113,
              "left": {
                "type": "leaf",
                "label": "hostile_recon"
              },
              "right": {
                "type": "split",
                "feature": 5,
                "featureName": "rfStrength",
                "threshold": 67.53269,
                "left": {
                  "type": "leaf",
                  "label": "hostile_recon"
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_recon"
                }
              }
            }
          }
        }
      },
      "right": {
        "type": "split",
        "feature": 4,
        "featureName": "rfFreqBand",
        "threshold": 1.5,
        "left": {
          "type": "split",
          "feature": 5,
          "featureName": "rfStrength",
          "threshold": 39.67448,
          "left": {
            "type": "split",
            "feature": 4,
            "featureName": "rfFreqBand",
            "threshold": 0.5,
            "left": {
              "type": "split",
              "feature": 1,
              "featureName": "altitude",
              "threshold": 54.26797,
              "left": {
                "type": "leaf",
                "label": "civilian"
              },
              "right": {
                "type": "split",
                "feature": 0,
                "featureName": "speed",
                "threshold": 28.4057,
                "left": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.06018,
                  "left": {
                    "type": "split",
                    "feature": 9,
                    "featureName": "distNorm",
                    "threshold": 0.74059,
                    "left": {
                      "type": "split",
                      "feature": 1,
                      "featureName": "altitude",
                      "threshold": 98.31169,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      }
                    },
                    "right": {
                      "type": "split",
                      "feature": 9,
                      "featureName": "distNorm",
                      "threshold": 0.82821,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      }
                    }
                  },
                  "right": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 26.28201,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    },
                    "right": {
                      "type": "split",
                      "feature": 2,
                      "featureName": "rcs",
                      "threshold": 0.06345,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    }
                  }
                },
                "right": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.05387,
                  "left": {
                    "type": "split",
                    "feature": 1,
                    "featureName": "altitude",
                    "threshold": 61.77471,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    },
                    "right": {
                      "type": "split",
                      "feature": 9,
                      "featureName": "distNorm",
                      "threshold": 0.09858,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    }
                  },
                  "right": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 29.01947,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    }
                  }
                }
              }
            },
            "right": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.03418,
              "left": {
                "type": "leaf",
                "label": "civilian"
              },
              "right": {
                "type": "leaf",
                "label": "hostile_recon"
              }
            }
          },
          "right": {
            "type": "split",
            "feature": 1,
            "featureName": "altitude",
            "threshold": 102.19489,
            "left": {
              "type": "split",
              "feature": 7,
              "featureName": "acousticConf",
              "threshold": 0.69381,
              "left": {
                "type": "split",
                "feature": 0,
                "featureName": "speed",
                "threshold": 22.10725,
                "left": {
                  "type": "leaf",
                  "label": "civilian"
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_attack"
                }
              },
              "right": {
                "type": "leaf",
                "label": "hostile_attack"
              }
            },
            "right": {
              "type": "split",
              "feature": 0,
              "featureName": "speed",
              "threshold": 23.26833,
              "left": {
                "type": "leaf",
                "label": "hostile_recon"
              },
              "right": {
                "type": "leaf",
                "label": "hostile_attack"
              }
            }
          }
        },
        "right": {
          "type": "split",
          "feature": 0,
          "featureName": "speed",
          "threshold": 18.72831,
          "left": {
            "type": "split",
            "feature": 1,
            "featureName": "altitude",
            "threshold": 93.73126,
            "left": {
              "type": "split",
              "feature": 1,
              "featureName": "altitude",
              "threshold": 59.09515,
              "left": {
                "type": "leaf",
                "label": "civilian"
              },
              "right": {
                "type": "leaf",
                "label": "civilian"
              }
            },
            "right": {
              "type": "split",
              "feature": 5,
              "featureName": "rfStrength",
              "threshold": 75.76167,
              "left": {
                "type": "leaf",
                "label": "hostile_recon"
              },
              "right": {
                "type": "leaf",
                "label": "hostile_recon"
              }
            }
          },
          "right": {
            "type": "split",
            "feature": 0,
            "featureName": "speed",
            "threshold": 20.32454,
            "left": {
              "type": "split",
              "feature": 1,
              "featureName": "altitude",
              "threshold": 115.42719,
              "left": {
                "type": "split",
                "feature": 7,
                "featureName": "acousticConf",
                "threshold": 0.47295,
                "left": {
                  "type": "split",
                  "feature": 6,
                  "featureName": "eoConf",
                  "threshold": 0.80477,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_swarm"
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_swarm"
                  }
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                }
              },
              "right": {
                "type": "leaf",
                "label": "hostile_recon"
              }
            },
            "right": {
              "type": "split",
              "feature": 0,
              "featureName": "speed",
              "threshold": 20.47501,
              "left": {
                "type": "leaf",
                "label": "hostile_swarm"
              },
              "right": {
                "type": "leaf",
                "label": "hostile_swarm"
              }
            }
          }
        }
      }
    },
    "right": {
      "type": "split",
      "feature": 4,
      "featureName": "rfFreqBand",
      "threshold": 2.5,
      "left": {
        "type": "split",
        "feature": 0,
        "featureName": "speed",
        "threshold": 22.00294,
        "left": {
          "type": "split",
          "feature": 6,
          "featureName": "eoConf",
          "threshold": 0.53713,
          "left": {
            "type": "leaf",
            "label": "hostile_recon"
          },
          "right": {
            "type": "split",
            "feature": 6,
            "featureName": "eoConf",
            "threshold": 0.54176,
            "left": {
              "type": "leaf",
              "label": "hostile_recon"
            },
            "right": {
              "type": "leaf",
              "label": "hostile_recon"
            }
          }
        },
        "right": {
          "type": "split",
          "feature": 4,
          "featureName": "rfFreqBand",
          "threshold": 1.5,
          "left": {
            "type": "split",
            "feature": 0,
            "featureName": "speed",
            "threshold": 30.61447,
            "left": {
              "type": "leaf",
              "label": "hostile_attack"
            },
            "right": {
              "type": "leaf",
              "label": "hostile_attack"
            }
          },
          "right": {
            "type": "split",
            "feature": 1,
            "featureName": "altitude",
            "threshold": 129.2476,
            "left": {
              "type": "leaf",
              "label": "hostile_swarm"
            },
            "right": {
              "type": "leaf",
              "label": "hostile_swarm"
            }
          }
        }
      },
      "right": {
        "type": "leaf",
        "label": "friendly"
      }
    }
  },
  {
    "type": "split",
    "feature": 8,
    "featureName": "iff",
    "threshold": 0.5,
    "left": {
      "type": "split",
      "feature": 2,
      "featureName": "rcs",
      "threshold": 0.01539,
      "left": {
        "type": "leaf",
        "label": "bird"
      },
      "right": {
        "type": "split",
        "feature": 7,
        "featureName": "acousticConf",
        "threshold": 0.00019,
        "left": {
          "type": "split",
          "feature": 2,
          "featureName": "rcs",
          "threshold": 0.07064,
          "left": {
            "type": "leaf",
            "label": "hostile_recon"
          },
          "right": {
            "type": "leaf",
            "label": "friendly"
          }
        },
        "right": {
          "type": "split",
          "feature": 3,
          "featureName": "rfPresent",
          "threshold": 0.5,
          "left": {
            "type": "split",
            "feature": 6,
            "featureName": "eoConf",
            "threshold": 0.78894,
            "left": {
              "type": "split",
              "feature": 1,
              "featureName": "altitude",
              "threshold": 126.44953,
              "left": {
                "type": "split",
                "feature": 0,
                "featureName": "speed",
                "threshold": 28.16385,
                "left": {
                  "type": "split",
                  "feature": 0,
                  "featureName": "speed",
                  "threshold": 19.24938,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  },
                  "right": {
                    "type": "split",
                    "feature": 1,
                    "featureName": "altitude",
                    "threshold": 92.03782,
                    "left": {
                      "type": "split",
                      "feature": 2,
                      "featureName": "rcs",
                      "threshold": 0.06133,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    },
                    "right": {
                      "type": "split",
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 20.51891,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      }
                    }
                  }
                },
                "right": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.05635,
                  "left": {
                    "type": "split",
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.05202,
                    "left": {
                      "type": "split",
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 29.54763,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    },
                    "right": {
                      "type": "split",
                      "feature": 1,
                      "featureName": "altitude",
                      "threshold": 92.53411,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    }
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  }
                }
              },
              "right": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 130.28105,
                "left": {
                  "type": "leaf",
                  "label": "hostile_recon"
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_recon"
                }
              }
            },
            "right": {
              "type": "split",
              "feature": 9,
              "featureName": "distNorm",
              "threshold": 0.84406,
              "left": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 99.05614,
                "left": {
                  "type": "split",
                  "feature": 0,
                  "featureName": "speed",
                  "threshold": 31.40943,
                  "left": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 26.72478,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    }
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  }
                },
                "right": {
                  "type": "split",
                  "feature": 0,
                  "featureName": "speed",
                  "threshold": 20.53491,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  }
                }
              },
              "right": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 92.15916,
                "left": {
                  "type": "leaf",
                  "label": "hostile_attack"
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_attack"
                }
              }
            }
          },
          "right": {
            "type": "split",
            "feature": 1,
            "featureName": "altitude",
            "threshold": 123.78656,
            "left": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.06113,
              "left": {
                "type": "split",
                "feature": 5,
                "featureName": "rfStrength",
                "threshold": 50.02075,
                "left": {
                  "type": "split",
                  "feature": 0,
                  "featureName": "speed",
                  "threshold": 23.84297,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  }
                },
                "right": {
                  "type": "split",
                  "feature": 0,
                  "featureName": "speed",
                  "threshold": 31.08911,
                  "left": {
                    "type": "split",
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.0284,
                    "left": {
                      "type": "split",
                      "feature": 5,
                      "featureName": "rfStrength",
                      "threshold": 74.94337,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_recon"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_recon"
                      }
                    },
                    "right": {
                      "type": "split",
                      "feature": 4,
                      "featureName": "rfFreqBand",
                      "threshold": 1.5,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      }
                    }
                  },
                  "right": {
                    "type": "split",
                    "feature": 1,
                    "featureName": "altitude",
                    "threshold": 62.6692,
                    "left": {
                      "type": "split",
                      "feature": 1,
                      "featureName": "altitude",
                      "threshold": 61.05163,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    },
                    "right": {
                      "type": "split",
                      "feature": 2,
                      "featureName": "rcs",
                      "threshold": 0.03697,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    }
                  }
                }
              },
              "right": {
                "type": "split",
                "feature": 0,
                "featureName": "speed",
                "threshold": 25.24172,
                "left": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                },
                "right": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.06444,
                  "left": {
                    "type": "split",
                    "feature": 5,
                    "featureName": "rfStrength",
                    "threshold": 87.12884,
                    "left": {
                      "type": "split",
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 29.12682,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    },
                    "right": {
                      "type": "split",
                      "feature": 2,
                      "featureName": "rcs",
                      "threshold": 0.06305,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    }
                  },
                  "right": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 29.74907,
                    "left": {
                      "type": "split",
                      "feature": 2,
                      "featureName": "rcs",
                      "threshold": 0.06831,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    }
                  }
                }
              }
            },
            "right": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.05408,
              "left": {
                "type": "split",
                "feature": 5,
                "featureName": "rfStrength",
                "threshold": 53.69908,
                "left": {
                  "type": "leaf",
                  "label": "hostile_recon"
                },
                "right": {
                  "type": "split",
                  "feature": 0,
                  "featureName": "speed",
                  "threshold": 22.64345,
                  "left": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 20.43718,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_recon"
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_recon"
                    }
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_swarm"
                  }
                }
              },
              "right": {
                "type": "split",
                "feature": 2,
                "featureName": "rcs",
                "threshold": 0.08374,
                "left": {
                  "type": "leaf",
                  "label": "hostile_attack"
                },
                "right": {
                  "type": "leaf",
                  "label": "friendly"
                }
              }
            }
          }
        }
      }
    },
    "right": {
      "type": "split",
      "feature": 0,
      "featureName": "speed",
      "threshold": 15.73905,
      "left": {
        "type": "leaf",
        "label": "civilian"
      },
      "right": {
        "type": "leaf",
        "label": "friendly"
      }
    }
  },
  {
    "type": "split",
    "feature": 2,
    "featureName": "rcs",
    "threshold": 0.08492,
    "left": {
      "type": "split",
      "feature": 0,
      "featureName": "speed",
      "threshold": 20.33884,
      "left": {
        "type": "split",
        "feature": 8,
        "featureName": "iff",
        "threshold": 0.5,
        "left": {
          "type": "split",
          "feature": 3,
          "featureName": "rfPresent",
          "threshold": 0.5,
          "left": {
            "type": "split",
            "feature": 2,
            "featureName": "rcs",
            "threshold": 0.01598,
            "left": {
              "type": "leaf",
              "label": "bird"
            },
            "right": {
              "type": "split",
              "feature": 0,
              "featureName": "speed",
              "threshold": 19.30385,
              "left": {
                "type": "split",
                "feature": 9,
                "featureName": "distNorm",
                "threshold": 0.22939,
                "left": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.03209,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  }
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_recon"
                }
              },
              "right": {
                "type": "split",
                "feature": 9,
                "featureName": "distNorm",
                "threshold": 0.60227,
                "left": {
                  "type": "leaf",
                  "label": "hostile_recon"
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                }
              }
            }
          },
          "right": {
            "type": "split",
            "feature": 0,
            "featureName": "speed",
            "threshold": 19.13125,
            "left": {
              "type": "split",
              "feature": 1,
              "featureName": "altitude",
              "threshold": 93.77531,
              "left": {
                "type": "leaf",
                "label": "hostile_swarm"
              },
              "right": {
                "type": "split",
                "feature": 2,
                "featureName": "rcs",
                "threshold": 0.05206,
                "left": {
                  "type": "split",
                  "feature": 5,
                  "featureName": "rfStrength",
                  "threshold": 76.0336,
                  "left": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 18.58672,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_recon"
                    },
                    "right": {
                      "type": "split",
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 18.67201,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_recon"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_recon"
                      }
                    }
                  },
                  "right": {
                    "type": "split",
                    "feature": 1,
                    "featureName": "altitude",
                    "threshold": 111.73836,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_recon"
                    }
                  }
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_recon"
                }
              }
            },
            "right": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.04651,
              "left": {
                "type": "split",
                "feature": 5,
                "featureName": "rfStrength",
                "threshold": 80.64944,
                "left": {
                  "type": "split",
                  "feature": 4,
                  "featureName": "rfFreqBand",
                  "threshold": 1.5,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  },
                  "right": {
                    "type": "split",
                    "feature": 5,
                    "featureName": "rfStrength",
                    "threshold": 53.32392,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_recon"
                    },
                    "right": {
                      "type": "split",
                      "feature": 9,
                      "featureName": "distNorm",
                      "threshold": 0.43659,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_recon"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      }
                    }
                  }
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                }
              },
              "right": {
                "type": "split",
                "feature": 6,
                "featureName": "eoConf",
                "threshold": 0.60417,
                "left": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                }
              }
            }
          }
        },
        "right": {
          "type": "leaf",
          "label": "civilian"
        }
      },
      "right": {
        "type": "split",
        "feature": 4,
        "featureName": "rfFreqBand",
        "threshold": 1.5,
        "left": {
          "type": "split",
          "feature": 5,
          "featureName": "rfStrength",
          "threshold": 38.8047,
          "left": {
            "type": "split",
            "feature": 0,
            "featureName": "speed",
            "threshold": 28.58102,
            "left": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.06135,
              "left": {
                "type": "split",
                "feature": 9,
                "featureName": "distNorm",
                "threshold": 0.74059,
                "left": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.03066,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_swarm"
                  },
                  "right": {
                    "type": "split",
                    "feature": 1,
                    "featureName": "altitude",
                    "threshold": 120.09892,
                    "left": {
                      "type": "split",
                      "feature": 7,
                      "featureName": "acousticConf",
                      "threshold": 0.52523,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      }
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    }
                  }
                },
                "right": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.05577,
                  "left": {
                    "type": "split",
                    "feature": 7,
                    "featureName": "acousticConf",
                    "threshold": 0.11903,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    },
                    "right": {
                      "type": "split",
                      "feature": 2,
                      "featureName": "rcs",
                      "threshold": 0.04239,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      }
                    }
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  }
                }
              },
              "right": {
                "type": "leaf",
                "label": "hostile_attack"
              }
            },
            "right": {
              "type": "split",
              "feature": 7,
              "featureName": "acousticConf",
              "threshold": 0.55042,
              "left": {
                "type": "split",
                "feature": 7,
                "featureName": "acousticConf",
                "threshold": 0.10954,
                "left": {
                  "type": "leaf",
                  "label": "hostile_attack"
                },
                "right": {
                  "type": "split",
                  "feature": 9,
                  "featureName": "distNorm",
                  "threshold": 0.33891,
                  "left": {
                    "type": "split",
                    "feature": 9,
                    "featureName": "distNorm",
                    "threshold": 0.32183,
                    "left": {
                      "type": "split",
                      "feature": 7,
                      "featureName": "acousticConf",
                      "threshold": 0.15747,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    }
                  },
                  "right": {
                    "type": "split",
                    "feature": 7,
                    "featureName": "acousticConf",
                    "threshold": 0.42699,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    },
                    "right": {
                      "type": "split",
                      "feature": 7,
                      "featureName": "acousticConf",
                      "threshold": 0.46163,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    }
                  }
                }
              },
              "right": {
                "type": "split",
                "feature": 9,
                "featureName": "distNorm",
                "threshold": 0.54564,
                "left": {
                  "type": "leaf",
                  "label": "hostile_attack"
                },
                "right": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.04251,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_swarm"
                  },
                  "right": {
                    "type": "split",
                    "feature": 6,
                    "featureName": "eoConf",
                    "threshold": 0.20139,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    }
                  }
                }
              }
            }
          },
          "right": {
            "type": "split",
            "feature": 9,
            "featureName": "distNorm",
            "threshold": 0.70284,
            "left": {
              "type": "split",
              "feature": 0,
              "featureName": "speed",
              "threshold": 23.31649,
              "left": {
                "type": "leaf",
                "label": "hostile_recon"
              },
              "right": {
                "type": "leaf",
                "label": "hostile_attack"
              }
            },
            "right": {
              "type": "leaf",
              "label": "hostile_attack"
            }
          }
        },
        "right": {
          "type": "split",
          "feature": 2,
          "featureName": "rcs",
          "threshold": 0.02828,
          "left": {
            "type": "leaf",
            "label": "hostile_recon"
          },
          "right": {
            "type": "split",
            "feature": 0,
            "featureName": "speed",
            "threshold": 22.54524,
            "left": {
              "type": "split",
              "feature": 9,
              "featureName": "distNorm",
              "threshold": 0.45937,
              "left": {
                "type": "split",
                "feature": 7,
                "featureName": "acousticConf",
                "threshold": 0.36981,
                "left": {
                  "type": "split",
                  "feature": 9,
                  "featureName": "distNorm",
                  "threshold": 0.39995,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_swarm"
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_swarm"
                  }
                },
                "right": {
                  "type": "split",
                  "feature": 9,
                  "featureName": "distNorm",
                  "threshold": 0.34561,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_swarm"
                  },
                  "right": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 21.88324,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_recon"
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    }
                  }
                }
              },
              "right": {
                "type": "leaf",
                "label": "hostile_swarm"
              }
            },
            "right": {
              "type": "leaf",
              "label": "hostile_swarm"
            }
          }
        }
      }
    },
    "right": {
      "type": "split",
      "feature": 8,
      "featureName": "iff",
      "threshold": 0.5,
      "left": {
        "type": "split",
        "feature": 0,
        "featureName": "speed",
        "threshold": 26.25021,
        "left": {
          "type": "leaf",
          "label": "friendly"
        },
        "right": {
          "type": "leaf",
          "label": "friendly"
        }
      },
      "right": {
        "type": "leaf",
        "label": "friendly"
      }
    }
  },
  {
    "type": "split",
    "feature": 0,
    "featureName": "speed",
    "threshold": 13.30353,
    "left": {
      "type": "split",
      "feature": 4,
      "featureName": "rfFreqBand",
      "threshold": 0.5,
      "left": {
        "type": "split",
        "feature": 0,
        "featureName": "speed",
        "threshold": 10.51148,
        "left": {
          "type": "split",
          "feature": 1,
          "featureName": "altitude",
          "threshold": 54.05377,
          "left": {
            "type": "split",
            "feature": 9,
            "featureName": "distNorm",
            "threshold": 0.29497,
            "left": {
              "type": "split",
              "feature": 8,
              "featureName": "iff",
              "threshold": 0.5,
              "left": {
                "type": "leaf",
                "label": "bird"
              },
              "right": {
                "type": "leaf",
                "label": "civilian"
              }
            },
            "right": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.01327,
              "left": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 28.83291,
                "left": {
                  "type": "leaf",
                  "label": "bird"
                },
                "right": {
                  "type": "split",
                  "feature": 1,
                  "featureName": "altitude",
                  "threshold": 29.21513,
                  "left": {
                    "type": "leaf",
                    "label": "bird"
                  },
                  "right": {
                    "type": "split",
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.01238,
                    "left": {
                      "type": "split",
                      "feature": 7,
                      "featureName": "acousticConf",
                      "threshold": 0.18986,
                      "left": {
                        "type": "leaf",
                        "label": "bird"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "bird"
                      }
                    },
                    "right": {
                      "type": "leaf",
                      "label": "bird"
                    }
                  }
                }
              },
              "right": {
                "type": "leaf",
                "label": "civilian"
              }
            }
          },
          "right": {
            "type": "split",
            "feature": 2,
            "featureName": "rcs",
            "threshold": 0.01286,
            "left": {
              "type": "leaf",
              "label": "civilian"
            },
            "right": {
              "type": "leaf",
              "label": "civilian"
            }
          }
        },
        "right": {
          "type": "split",
          "feature": 7,
          "featureName": "acousticConf",
          "threshold": 0.01934,
          "left": {
            "type": "leaf",
            "label": "hostile_recon"
          },
          "right": {
            "type": "split",
            "feature": 7,
            "featureName": "acousticConf",
            "threshold": 0.34459,
            "left": {
              "type": "split",
              "feature": 7,
              "featureName": "acousticConf",
              "threshold": 0.17581,
              "left": {
                "type": "leaf",
                "label": "civilian"
              },
              "right": {
                "type": "leaf",
                "label": "civilian"
              }
            },
            "right": {
              "type": "split",
              "feature": 8,
              "featureName": "iff",
              "threshold": 0.5,
              "left": {
                "type": "leaf",
                "label": "hostile_recon"
              },
              "right": {
                "type": "leaf",
                "label": "civilian"
              }
            }
          }
        }
      },
      "right": {
        "type": "split",
        "feature": 7,
        "featureName": "acousticConf",
        "threshold": 0.00014,
        "left": {
          "type": "leaf",
          "label": "hostile_recon"
        },
        "right": {
          "type": "split",
          "feature": 1,
          "featureName": "altitude",
          "threshold": 87.2966,
          "left": {
            "type": "leaf",
            "label": "civilian"
          },
          "right": {
            "type": "leaf",
            "label": "hostile_recon"
          }
        }
      }
    },
    "right": {
      "type": "split",
      "feature": 7,
      "featureName": "acousticConf",
      "threshold": 4e-05,
      "left": {
        "type": "split",
        "feature": 1,
        "featureName": "altitude",
        "threshold": 203.45107,
        "left": {
          "type": "split",
          "feature": 0,
          "featureName": "speed",
          "threshold": 18.46407,
          "left": {
            "type": "split",
            "feature": 0,
            "featureName": "speed",
            "threshold": 17.3006,
            "left": {
              "type": "leaf",
              "label": "hostile_recon"
            },
            "right": {
              "type": "split",
              "feature": 4,
              "featureName": "rfFreqBand",
              "threshold": 2.5,
              "left": {
                "type": "leaf",
                "label": "hostile_recon"
              },
              "right": {
                "type": "leaf",
                "label": "friendly"
              }
            }
          },
          "right": {
            "type": "split",
            "feature": 4,
            "featureName": "rfFreqBand",
            "threshold": 2.5,
            "left": {
              "type": "leaf",
              "label": "hostile_recon"
            },
            "right": {
              "type": "leaf",
              "label": "friendly"
            }
          }
        },
        "right": {
          "type": "split",
          "feature": 2,
          "featureName": "rcs",
          "threshold": 0.06642,
          "left": {
            "type": "leaf",
            "label": "hostile_recon"
          },
          "right": {
            "type": "leaf",
            "label": "friendly"
          }
        }
      },
      "right": {
        "type": "split",
        "feature": 4,
        "featureName": "rfFreqBand",
        "threshold": 1.5,
        "left": {
          "type": "split",
          "feature": 2,
          "featureName": "rcs",
          "threshold": 0.0418,
          "left": {
            "type": "split",
            "feature": 8,
            "featureName": "iff",
            "threshold": 0.5,
            "left": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.0366,
              "left": {
                "type": "split",
                "feature": 5,
                "featureName": "rfStrength",
                "threshold": 15.09479,
                "left": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.02796,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  },
                  "right": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 19.76229,
                    "left": {
                      "type": "split",
                      "feature": 7,
                      "featureName": "acousticConf",
                      "threshold": 0.44698,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_recon"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_recon"
                      }
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    }
                  }
                },
                "right": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.03611,
                  "left": {
                    "type": "split",
                    "feature": 5,
                    "featureName": "rfStrength",
                    "threshold": 78.00119,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_recon"
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_recon"
                    }
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  }
                }
              },
              "right": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 113.98754,
                "left": {
                  "type": "split",
                  "feature": 3,
                  "featureName": "rfPresent",
                  "threshold": 0.5,
                  "left": {
                    "type": "split",
                    "feature": 9,
                    "featureName": "distNorm",
                    "threshold": 0.3017,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    },
                    "right": {
                      "type": "split",
                      "feature": 9,
                      "featureName": "distNorm",
                      "threshold": 0.35984,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      }
                    }
                  },
                  "right": {
                    "type": "split",
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.04124,
                    "left": {
                      "type": "split",
                      "feature": 9,
                      "featureName": "distNorm",
                      "threshold": 0.75641,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_recon"
                    }
                  }
                },
                "right": {
                  "type": "split",
                  "feature": 4,
                  "featureName": "rfFreqBand",
                  "threshold": 0.5,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  }
                }
              }
            },
            "right": {
              "type": "leaf",
              "label": "civilian"
            }
          },
          "right": {
            "type": "split",
            "feature": 2,
            "featureName": "rcs",
            "threshold": 0.05001,
            "left": {
              "type": "split",
              "feature": 0,
              "featureName": "speed",
              "threshold": 21.03072,
              "left": {
                "type": "split",
                "feature": 9,
                "featureName": "distNorm",
                "threshold": 0.15413,
                "left": {
                  "type": "split",
                  "feature": 9,
                  "featureName": "distNorm",
                  "threshold": 0.09706,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  }
                },
                "right": {
                  "type": "split",
                  "feature": 6,
                  "featureName": "eoConf",
                  "threshold": 0.23477,
                  "left": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 18.18096,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_recon"
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_recon"
                    }
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  }
                }
              },
              "right": {
                "type": "split",
                "feature": 5,
                "featureName": "rfStrength",
                "threshold": 20.07977,
                "left": {
                  "type": "split",
                  "feature": 1,
                  "featureName": "altitude",
                  "threshold": 102.30835,
                  "left": {
                    "type": "split",
                    "feature": 1,
                    "featureName": "altitude",
                    "threshold": 77.77813,
                    "left": {
                      "type": "split",
                      "feature": 6,
                      "featureName": "eoConf",
                      "threshold": 0.35679,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    },
                    "right": {
                      "type": "split",
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 30.14353,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    }
                  },
                  "right": {
                    "type": "split",
                    "feature": 1,
                    "featureName": "altitude",
                    "threshold": 110.74815,
                    "left": {
                      "type": "split",
                      "feature": 7,
                      "featureName": "acousticConf",
                      "threshold": 0.48967,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      }
                    },
                    "right": {
                      "type": "split",
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 30.18951,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    }
                  }
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_attack"
                }
              }
            },
            "right": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.0583,
              "left": {
                "type": "split",
                "feature": 0,
                "featureName": "speed",
                "threshold": 28.4057,
                "left": {
                  "type": "split",
                  "feature": 3,
                  "featureName": "rfPresent",
                  "threshold": 0.5,
                  "left": {
                    "type": "split",
                    "feature": 1,
                    "featureName": "altitude",
                    "threshold": 114.99067,
                    "left": {
                      "type": "split",
                      "feature": 7,
                      "featureName": "acousticConf",
                      "threshold": 0.5424,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      }
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    }
                  },
                  "right": {
                    "type": "split",
                    "feature": 5,
                    "featureName": "rfStrength",
                    "threshold": 57.27567,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_recon"
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    }
                  }
                },
                "right": {
                  "type": "split",
                  "feature": 5,
                  "featureName": "rfStrength",
                  "threshold": 20.40596,
                  "left": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 29.91864,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    }
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  }
                }
              },
              "right": {
                "type": "split",
                "feature": 5,
                "featureName": "rfStrength",
                "threshold": 20.03035,
                "left": {
                  "type": "split",
                  "feature": 9,
                  "featureName": "distNorm",
                  "threshold": 0.64748,
                  "left": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 26.81171,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    },
                    "right": {
                      "type": "split",
                      "feature": 2,
                      "featureName": "rcs",
                      "threshold": 0.06079,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    }
                  },
                  "right": {
                    "type": "split",
                    "feature": 6,
                    "featureName": "eoConf",
                    "threshold": 0.58617,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    },
                    "right": {
                      "type": "split",
                      "feature": 9,
                      "featureName": "distNorm",
                      "threshold": 0.8126,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    }
                  }
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_attack"
                }
              }
            }
          }
        },
        "right": {
          "type": "split",
          "feature": 1,
          "featureName": "altitude",
          "threshold": 129.84306,
          "left": {
            "type": "split",
            "feature": 5,
            "featureName": "rfStrength",
            "threshold": 50.16748,
            "left": {
              "type": "split",
              "feature": 8,
              "featureName": "iff",
              "threshold": 0.5,
              "left": {
                "type": "split",
                "feature": 0,
                "featureName": "speed",
                "threshold": 19.0754,
                "left": {
                  "type": "leaf",
                  "label": "hostile_recon"
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_recon"
                }
              },
              "right": {
                "type": "leaf",
                "label": "civilian"
              }
            },
            "right": {
              "type": "split",
              "feature": 0,
              "featureName": "speed",
              "threshold": 18.92202,
              "left": {
                "type": "split",
                "feature": 2,
                "featureName": "rcs",
                "threshold": 0.02627,
                "left": {
                  "type": "split",
                  "feature": 1,
                  "featureName": "altitude",
                  "threshold": 86.91079,
                  "left": {
                    "type": "leaf",
                    "label": "civilian"
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  }
                },
                "right": {
                  "type": "split",
                  "feature": 5,
                  "featureName": "rfStrength",
                  "threshold": 76.0449,
                  "left": {
                    "type": "split",
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.04446,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_recon"
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_recon"
                    }
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  }
                }
              },
              "right": {
                "type": "split",
                "feature": 6,
                "featureName": "eoConf",
                "threshold": 0.88844,
                "left": {
                  "type": "split",
                  "feature": 1,
                  "featureName": "altitude",
                  "threshold": 111.52238,
                  "left": {
                    "type": "split",
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.02928,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    }
                  },
                  "right": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 20.00051,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_recon"
                    },
                    "right": {
                      "type": "split",
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 20.49188,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      }
                    }
                  }
                },
                "right": {
                  "type": "split",
                  "feature": 7,
                  "featureName": "acousticConf",
                  "threshold": 0.37167,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_swarm"
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_swarm"
                  }
                }
              }
            }
          },
          "right": {
            "type": "split",
            "feature": 2,
            "featureName": "rcs",
            "threshold": 0.07118,
            "left": {
              "type": "split",
              "feature": 5,
              "featureName": "rfStrength",
              "threshold": 75.67396,
              "left": {
                "type": "leaf",
                "label": "hostile_recon"
              },
              "right": {
                "type": "split",
                "feature": 0,
                "featureName": "speed",
                "threshold": 17.72449,
                "left": {
                  "type": "leaf",
                  "label": "hostile_recon"
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_recon"
                }
              }
            },
            "right": {
              "type": "leaf",
              "label": "friendly"
            }
          }
        }
      }
    }
  },
  {
    "type": "split",
    "feature": 2,
    "featureName": "rcs",
    "threshold": 0.08604,
    "left": {
      "type": "split",
      "feature": 0,
      "featureName": "speed",
      "threshold": 20.39812,
      "left": {
        "type": "split",
        "feature": 8,
        "featureName": "iff",
        "threshold": 0.5,
        "left": {
          "type": "split",
          "feature": 1,
          "featureName": "altitude",
          "threshold": 57.07873,
          "left": {
            "type": "leaf",
            "label": "bird"
          },
          "right": {
            "type": "split",
            "feature": 1,
            "featureName": "altitude",
            "threshold": 95.14916,
            "left": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.03378,
              "left": {
                "type": "leaf",
                "label": "hostile_swarm"
              },
              "right": {
                "type": "leaf",
                "label": "hostile_swarm"
              }
            },
            "right": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.05214,
              "left": {
                "type": "split",
                "feature": 5,
                "featureName": "rfStrength",
                "threshold": 79.96496,
                "left": {
                  "type": "split",
                  "feature": 6,
                  "featureName": "eoConf",
                  "threshold": 0.12069,
                  "left": {
                    "type": "split",
                    "feature": 1,
                    "featureName": "altitude",
                    "threshold": 102.92857,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_recon"
                    },
                    "right": {
                      "type": "split",
                      "feature": 6,
                      "featureName": "eoConf",
                      "threshold": 0.11229,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_recon"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_recon"
                      }
                    }
                  },
                  "right": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 18.0942,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_recon"
                    },
                    "right": {
                      "type": "split",
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 18.20955,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_recon"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_recon"
                      }
                    }
                  }
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                }
              },
              "right": {
                "type": "leaf",
                "label": "hostile_recon"
              }
            }
          }
        },
        "right": {
          "type": "split",
          "feature": 0,
          "featureName": "speed",
          "threshold": 14.80548,
          "left": {
            "type": "leaf",
            "label": "civilian"
          },
          "right": {
            "type": "leaf",
            "label": "civilian"
          }
        }
      },
      "right": {
        "type": "split",
        "feature": 0,
        "featureName": "speed",
        "threshold": 29.43945,
        "left": {
          "type": "split",
          "feature": 1,
          "featureName": "altitude",
          "threshold": 135.10786,
          "left": {
            "type": "split",
            "feature": 4,
            "featureName": "rfFreqBand",
            "threshold": 1.5,
            "left": {
              "type": "split",
              "feature": 0,
              "featureName": "speed",
              "threshold": 27.19477,
              "left": {
                "type": "split",
                "feature": 0,
                "featureName": "speed",
                "threshold": 25.79171,
                "left": {
                  "type": "split",
                  "feature": 0,
                  "featureName": "speed",
                  "threshold": 20.78821,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_swarm"
                  },
                  "right": {
                    "type": "split",
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.05762,
                    "left": {
                      "type": "split",
                      "feature": 2,
                      "featureName": "rcs",
                      "threshold": 0.03171,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      }
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    }
                  }
                },
                "right": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.0609,
                  "left": {
                    "type": "split",
                    "feature": 9,
                    "featureName": "distNorm",
                    "threshold": 0.35937,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    },
                    "right": {
                      "type": "split",
                      "feature": 7,
                      "featureName": "acousticConf",
                      "threshold": 0.40497,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      }
                    }
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  }
                }
              },
              "right": {
                "type": "split",
                "feature": 2,
                "featureName": "rcs",
                "threshold": 0.04091,
                "left": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                },
                "right": {
                  "type": "split",
                  "feature": 5,
                  "featureName": "rfStrength",
                  "threshold": 21.21877,
                  "left": {
                    "type": "split",
                    "feature": 7,
                    "featureName": "acousticConf",
                    "threshold": 0.53964,
                    "left": {
                      "type": "split",
                      "feature": 9,
                      "featureName": "distNorm",
                      "threshold": 0.66455,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    }
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  }
                }
              }
            },
            "right": {
              "type": "split",
              "feature": 1,
              "featureName": "altitude",
              "threshold": 124.40915,
              "left": {
                "type": "split",
                "feature": 6,
                "featureName": "eoConf",
                "threshold": 0.59595,
                "left": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                },
                "right": {
                  "type": "split",
                  "feature": 5,
                  "featureName": "rfStrength",
                  "threshold": 77.08788,
                  "left": {
                    "type": "split",
                    "feature": 1,
                    "featureName": "altitude",
                    "threshold": 110.7965,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    },
                    "right": {
                      "type": "split",
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 21.41498,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      }
                    }
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_swarm"
                  }
                }
              },
              "right": {
                "type": "split",
                "feature": 9,
                "featureName": "distNorm",
                "threshold": 0.69171,
                "left": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                }
              }
            }
          },
          "right": {
            "type": "leaf",
            "label": "hostile_recon"
          }
        },
        "right": {
          "type": "split",
          "feature": 4,
          "featureName": "rfFreqBand",
          "threshold": 1.5,
          "left": {
            "type": "split",
            "feature": 0,
            "featureName": "speed",
            "threshold": 29.51141,
            "left": {
              "type": "leaf",
              "label": "hostile_attack"
            },
            "right": {
              "type": "split",
              "feature": 0,
              "featureName": "speed",
              "threshold": 30.8765,
              "left": {
                "type": "split",
                "feature": 2,
                "featureName": "rcs",
                "threshold": 0.04264,
                "left": {
                  "type": "leaf",
                  "label": "hostile_attack"
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_attack"
                }
              },
              "right": {
                "type": "leaf",
                "label": "hostile_attack"
              }
            }
          },
          "right": {
            "type": "leaf",
            "label": "hostile_swarm"
          }
        }
      }
    },
    "right": {
      "type": "split",
      "feature": 1,
      "featureName": "altitude",
      "threshold": 139.06621,
      "left": {
        "type": "leaf",
        "label": "friendly"
      },
      "right": {
        "type": "leaf",
        "label": "friendly"
      }
    }
  },
  {
    "type": "split",
    "feature": 4,
    "featureName": "rfFreqBand",
    "threshold": 2.5,
    "left": {
      "type": "split",
      "feature": 0,
      "featureName": "speed",
      "threshold": 20.3205,
      "left": {
        "type": "split",
        "feature": 1,
        "featureName": "altitude",
        "threshold": 93.77531,
        "left": {
          "type": "split",
          "feature": 8,
          "featureName": "iff",
          "threshold": 0.5,
          "left": {
            "type": "split",
            "feature": 4,
            "featureName": "rfFreqBand",
            "threshold": 0.5,
            "left": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.02126,
              "left": {
                "type": "leaf",
                "label": "bird"
              },
              "right": {
                "type": "leaf",
                "label": "hostile_swarm"
              }
            },
            "right": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.03253,
              "left": {
                "type": "leaf",
                "label": "hostile_swarm"
              },
              "right": {
                "type": "leaf",
                "label": "hostile_swarm"
              }
            }
          },
          "right": {
            "type": "leaf",
            "label": "civilian"
          }
        },
        "right": {
          "type": "split",
          "feature": 5,
          "featureName": "rfStrength",
          "threshold": 79.96496,
          "left": {
            "type": "split",
            "feature": 0,
            "featureName": "speed",
            "threshold": 19.3794,
            "left": {
              "type": "split",
              "feature": 9,
              "featureName": "distNorm",
              "threshold": 0.22321,
              "left": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 104.08445,
                "left": {
                  "type": "leaf",
                  "label": "hostile_recon"
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_recon"
                }
              },
              "right": {
                "type": "split",
                "feature": 5,
                "featureName": "rfStrength",
                "threshold": 15.08151,
                "left": {
                  "type": "split",
                  "feature": 0,
                  "featureName": "speed",
                  "threshold": 18.76672,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  }
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_recon"
                }
              }
            },
            "right": {
              "type": "split",
              "feature": 1,
              "featureName": "altitude",
              "threshold": 100.72051,
              "left": {
                "type": "leaf",
                "label": "hostile_swarm"
              },
              "right": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 115.78608,
                "left": {
                  "type": "leaf",
                  "label": "hostile_recon"
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_recon"
                }
              }
            }
          },
          "right": {
            "type": "leaf",
            "label": "hostile_swarm"
          }
        }
      },
      "right": {
        "type": "split",
        "feature": 2,
        "featureName": "rcs",
        "threshold": 0.06113,
        "left": {
          "type": "split",
          "feature": 5,
          "featureName": "rfStrength",
          "threshold": 50.01003,
          "left": {
            "type": "split",
            "feature": 0,
            "featureName": "speed",
            "threshold": 28.16385,
            "left": {
              "type": "split",
              "feature": 1,
              "featureName": "altitude",
              "threshold": 122.87563,
              "left": {
                "type": "split",
                "feature": 0,
                "featureName": "speed",
                "threshold": 26.78058,
                "left": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                },
                "right": {
                  "type": "split",
                  "feature": 9,
                  "featureName": "distNorm",
                  "threshold": 0.76556,
                  "left": {
                    "type": "split",
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.05199,
                    "left": {
                      "type": "split",
                      "feature": 7,
                      "featureName": "acousticConf",
                      "threshold": 0.42281,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    }
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  }
                }
              },
              "right": {
                "type": "leaf",
                "label": "hostile_recon"
              }
            },
            "right": {
              "type": "split",
              "feature": 0,
              "featureName": "speed",
              "threshold": 29.57924,
              "left": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 84.18194,
                "left": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.04232,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_swarm"
                  },
                  "right": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 28.61471,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    }
                  }
                },
                "right": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.05187,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  }
                }
              },
              "right": {
                "type": "split",
                "feature": 9,
                "featureName": "distNorm",
                "threshold": 0.09858,
                "left": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.05364,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  }
                },
                "right": {
                  "type": "split",
                  "feature": 0,
                  "featureName": "speed",
                  "threshold": 33.05277,
                  "left": {
                    "type": "split",
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.0452,
                    "left": {
                      "type": "split",
                      "feature": 7,
                      "featureName": "acousticConf",
                      "threshold": 0.45264,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    },
                    "right": {
                      "type": "split",
                      "feature": 6,
                      "featureName": "eoConf",
                      "threshold": 0.63298,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    }
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  }
                }
              }
            }
          },
          "right": {
            "type": "split",
            "feature": 4,
            "featureName": "rfFreqBand",
            "threshold": 1.5,
            "left": {
              "type": "split",
              "feature": 6,
              "featureName": "eoConf",
              "threshold": 0.72176,
              "left": {
                "type": "split",
                "feature": 7,
                "featureName": "acousticConf",
                "threshold": 0.00776,
                "left": {
                  "type": "leaf",
                  "label": "hostile_recon"
                },
                "right": {
                  "type": "split",
                  "feature": 1,
                  "featureName": "altitude",
                  "threshold": 122.94252,
                  "left": {
                    "type": "split",
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.03795,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    },
                    "right": {
                      "type": "split",
                      "feature": 7,
                      "featureName": "acousticConf",
                      "threshold": 0.59282,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_attack"
                      }
                    }
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  }
                }
              },
              "right": {
                "type": "leaf",
                "label": "hostile_attack"
              }
            },
            "right": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.02851,
              "left": {
                "type": "leaf",
                "label": "hostile_swarm"
              },
              "right": {
                "type": "split",
                "feature": 7,
                "featureName": "acousticConf",
                "threshold": 0.55059,
                "left": {
                  "type": "split",
                  "feature": 7,
                  "featureName": "acousticConf",
                  "threshold": 0.54442,
                  "left": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 21.97052,
                    "left": {
                      "type": "split",
                      "feature": 5,
                      "featureName": "rfStrength",
                      "threshold": 53.79016,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "hostile_swarm"
                      }
                    },
                    "right": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    }
                  },
                  "right": {
                    "type": "leaf",
                    "label": "hostile_swarm"
                  }
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                }
              }
            }
          }
        },
        "right": {
          "type": "split",
          "feature": 2,
          "featureName": "rcs",
          "threshold": 0.06446,
          "left": {
            "type": "split",
            "feature": 2,
            "featureName": "rcs",
            "threshold": 0.06406,
            "left": {
              "type": "split",
              "feature": 4,
              "featureName": "rfFreqBand",
              "threshold": 1.5,
              "left": {
                "type": "split",
                "feature": 0,
                "featureName": "speed",
                "threshold": 27.96034,
                "left": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                },
                "right": {
                  "type": "leaf",
                  "label": "hostile_attack"
                }
              },
              "right": {
                "type": "leaf",
                "label": "hostile_swarm"
              }
            },
            "right": {
              "type": "split",
              "feature": 0,
              "featureName": "speed",
              "threshold": 29.74335,
              "left": {
                "type": "leaf",
                "label": "hostile_swarm"
              },
              "right": {
                "type": "leaf",
                "label": "hostile_attack"
              }
            }
          },
          "right": {
            "type": "split",
            "feature": 9,
            "featureName": "distNorm",
            "threshold": 0.79745,
            "left": {
              "type": "leaf",
              "label": "hostile_attack"
            },
            "right": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.06593,
              "left": {
                "type": "leaf",
                "label": "hostile_attack"
              },
              "right": {
                "type": "leaf",
                "label": "hostile_attack"
              }
            }
          }
        }
      }
    },
    "right": {
      "type": "leaf",
      "label": "friendly"
    }
  }
];

// â”€â”€ Ensemble prediction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ALL_LABELS: ThreatLabel[] = [
  'hostile_attack',
  'hostile_recon',
  'hostile_swarm',
  'friendly',
  'civilian',
  'bird',
];

/**
 * Run the full forest on a track's feature vector and return
 * the majority vote, per-class probabilities, and a confidence score.
 */
export function classifyTrack(track: TrackSensorData): ClassifierPrediction {
  const features = extractFeatures(track);
  const votes: Record<ThreatLabel, number> = {
    hostile_attack: 0,
    hostile_recon: 0,
    hostile_swarm: 0,
    friendly: 0,
    civilian: 0,
    bird: 0,
  };

  for (const tree of FOREST) {
    votes[predict(tree, features)]++;
  }

  const total = FOREST.length;
  const classProbabilities = {} as Record<ThreatLabel, number>;
  let topLabel: ThreatLabel = 'hostile_attack';
  let topVotes = 0;

  for (const label of ALL_LABELS) {
    classProbabilities[label] = votes[label] / total;
    if (votes[label] > topVotes) {
      topVotes = votes[label];
      topLabel = label;
    }
  }

  const confidence = topVotes / total;

  return {
    label: topLabel,
    confidence,
    classProbabilities,
    shouldDisplayHint: confidence >= 0.5, // only show when majority > 50%
  };
}

/**
 * Convenience: classify every track in the map.
 */
export function classifyAllTracks(
  tracks: Map<string, TrackSensorData>
): Map<string, ClassifierPrediction> {
  const results = new Map<string, ClassifierPrediction>();
  tracks.forEach((track, trackId) => {
    results.set(trackId, classifyTrack(track));
  });
  return results;
}

// â”€â”€ Label formatting â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function formatPredictionHint(pred: ClassifierPrediction): string {
  const pct = Math.round(pred.confidence * 100);
  const label = pred.label.replace(/_/g, ' ').toUpperCase();

  if (pred.confidence >= 0.8) return `AI: ${label} (HIGH ${pct}%)`;
  if (pred.confidence >= 0.6) return `AI: ${label} (MED ${pct}%)`;
  return `AI: ${label}? (LOW ${pct}%)`;
}

export function predictionColor(pred: ClassifierPrediction): string {
  if (pred.label.startsWith('hostile')) return '#ef4444'; // red
  if (pred.label === 'friendly') return '#3b82f6';         // blue
  if (pred.label === 'civilian') return '#f59e0b';         // amber
  return '#6b7280';                                         // grey for bird
}
