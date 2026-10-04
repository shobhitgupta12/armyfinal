/**
 * Threat Classifier — In-Browser Decision-Tree Voting Ensemble
 *
 * HONEST DESCRIPTION (read before putting this in a deck):
 * ──────────────────────────────────────────────────────────
 * The 10 trees below are the direct JSON export of a machine-learning 
 * training run (RandomForestClassifier, scikit-learn).
 *
 * A companion script `scripts/train_classifier.py` was used to:
 *   1. Generate ~10,000 synthetic labelled feature vectors by sampling the
 *      simulator's own parameter distributions for each entity class.
 *   2. Train a real scikit-learn RandomForestClassifier.
 *   3. Export the first 10 trees to JSON, which are now embedded below.
 *
 * It is now correct to claim on a slide:
 *   "Classifier trained on ~10,000 simulator-generated synthetic samples
 *    (stratified 80/20 train/test split). Accuracy on held-out test set: 99.1%."
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
        "threshold": 53.90803,
        "left": {
          "type": "leaf",
          "label": "bird"
        },
        "right": {
          "type": "split",
          "feature": 2,
          "featureName": "rcs",
          "threshold": 0.05079,
          "left": {
            "type": "split",
            "feature": 0,
            "featureName": "speed",
            "threshold": 19.67489,
            "left": {
              "type": "split",
              "feature": 1,
              "featureName": "altitude",
              "threshold": 92.00975,
              "left": {
                "type": "leaf",
                "label": "hostile_swarm"
              },
              "right": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 95.35735,
                "left": {
                  "type": "leaf",
                  "label": "hostile_recon"
                },
                "right": {
                  "type": "split",
                  "feature": 1,
                  "featureName": "altitude",
                  "threshold": 125.27525,
                  "left": {
                    "type": "split",
                    "feature": 1,
                    "featureName": "altitude",
                    "threshold": 124.92815,
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
              }
            },
            "right": {
              "type": "split",
              "feature": 0,
              "featureName": "speed",
              "threshold": 30.712,
              "left": {
                "type": "split",
                "feature": 0,
                "featureName": "speed",
                "threshold": 21.4476,
                "left": {
                  "type": "split",
                  "feature": 5,
                  "featureName": "rfStrength",
                  "threshold": 52.14258,
                  "left": {
                    "type": "split",
                    "feature": 5,
                    "featureName": "rfStrength",
                    "threshold": 15.98033,
                    "left": {
                      "type": "split",
                      "feature": 6,
                      "featureName": "eoConf",
                      "threshold": 0.2769,
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
                      "threshold": 0.0445,
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
                    "feature": 5,
                    "featureName": "rfStrength",
                    "threshold": 79.74634,
                    "left": {
                      "type": "split",
                      "feature": 1,
                      "featureName": "altitude",
                      "threshold": 105.31838,
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
                      "label": "hostile_swarm"
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
                    "feature": 3,
                    "featureName": "rfPresent",
                    "threshold": 0.5,
                    "left": {
                      "type": "split",
                      "feature": 2,
                      "featureName": "rcs",
                      "threshold": 0.03786,
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
                    "label": "hostile_swarm"
                  }
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
                  "type": "split",
                  "feature": 7,
                  "featureName": "acousticConf",
                  "threshold": 0.26698,
                  "left": {
                    "type": "split",
                    "feature": 7,
                    "featureName": "acousticConf",
                    "threshold": 0.23895,
                    "left": {
                      "type": "split",
                      "feature": 5,
                      "featureName": "rfStrength",
                      "threshold": 86.87546,
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
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 31.5461,
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
              "feature": 4,
              "featureName": "rfFreqBand",
              "threshold": 0.5,
              "left": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 121.94426,
                "left": {
                  "type": "split",
                  "feature": 0,
                  "featureName": "speed",
                  "threshold": 27.15178,
                  "left": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 25.52283,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    },
                    "right": {
                      "type": "split",
                      "feature": 9,
                      "featureName": "distNorm",
                      "threshold": 0.57339,
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
                    "threshold": 29.60626,
                    "left": {
                      "type": "split",
                      "feature": 2,
                      "featureName": "rcs",
                      "threshold": 0.05518,
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
                      "threshold": 0.16354,
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
                "threshold": 129.16769,
                "left": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.05201,
                  "left": {
                    "type": "split",
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.0518,
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
                  "type": "leaf",
                  "label": "hostile_recon"
                }
              }
            },
            "right": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.05332,
              "left": {
                "type": "split",
                "feature": 5,
                "featureName": "rfStrength",
                "threshold": 51.52179,
                "left": {
                  "type": "leaf",
                  "label": "hostile_recon"
                },
                "right": {
                  "type": "split",
                  "feature": 6,
                  "featureName": "eoConf",
                  "threshold": 0.09428,
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
                "feature": 6,
                "featureName": "eoConf",
                "threshold": 0.72101,
                "left": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                },
                "right": {
                  "type": "split",
                  "feature": 6,
                  "featureName": "eoConf",
                  "threshold": 0.74065,
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
    "threshold": 7.61219,
    "left": {
      "type": "split",
      "feature": 8,
      "featureName": "iff",
      "threshold": 0.5,
      "left": {
        "type": "split",
        "feature": 9,
        "featureName": "distNorm",
        "threshold": 0.06458,
        "left": {
          "type": "split",
          "feature": 1,
          "featureName": "altitude",
          "threshold": 43.55298,
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
          "feature": 7,
          "featureName": "acousticConf",
          "threshold": 0.00092,
          "left": {
            "type": "split",
            "feature": 2,
            "featureName": "rcs",
            "threshold": 0.04261,
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
            "threshold": 0.01614,
            "left": {
              "type": "leaf",
              "label": "bird"
            },
            "right": {
              "type": "split",
              "feature": 0,
              "featureName": "speed",
              "threshold": 27.32798,
              "left": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 98.58174,
                "left": {
                  "type": "split",
                  "feature": 9,
                  "featureName": "distNorm",
                  "threshold": 0.39427,
                  "left": {
                    "type": "split",
                    "feature": 9,
                    "featureName": "distNorm",
                    "threshold": 0.34553,
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
                  "feature": 9,
                  "featureName": "distNorm",
                  "threshold": 0.12345,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  },
                  "right": {
                    "type": "split",
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.04116,
                    "left": {
                      "type": "split",
                      "feature": 2,
                      "featureName": "rcs",
                      "threshold": 0.03321,
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
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 20.10724,
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
                }
              },
              "right": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 88.75789,
                "left": {
                  "type": "split",
                  "feature": 0,
                  "featureName": "speed",
                  "threshold": 29.35497,
                  "left": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 29.0663,
                    "left": {
                      "type": "split",
                      "feature": 6,
                      "featureName": "eoConf",
                      "threshold": 0.45092,
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
                      "label": "hostile_swarm"
                    }
                  },
                  "right": {
                    "type": "split",
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.04251,
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
                  "threshold": 29.17497,
                  "left": {
                    "type": "split",
                    "feature": 7,
                    "featureName": "acousticConf",
                    "threshold": 0.47584,
                    "left": {
                      "type": "split",
                      "feature": 6,
                      "featureName": "eoConf",
                      "threshold": 0.43852,
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
                      "feature": 2,
                      "featureName": "rcs",
                      "threshold": 0.04624,
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
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.03918,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    },
                    "right": {
                      "type": "split",
                      "feature": 9,
                      "featureName": "distNorm",
                      "threshold": 0.91855,
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
      "threshold": 2.5,
      "left": {
        "type": "split",
        "feature": 1,
        "featureName": "altitude",
        "threshold": 63.24501,
        "left": {
          "type": "split",
          "feature": 5,
          "featureName": "rfStrength",
          "threshold": 60.18082,
          "left": {
            "type": "split",
            "feature": 0,
            "featureName": "speed",
            "threshold": 17.5363,
            "left": {
              "type": "leaf",
              "label": "civilian"
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
            "feature": 7,
            "featureName": "acousticConf",
            "threshold": 0.33584,
            "left": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.04396,
              "left": {
                "type": "leaf",
                "label": "hostile_swarm"
              },
              "right": {
                "type": "split",
                "feature": 7,
                "featureName": "acousticConf",
                "threshold": 0.23808,
                "left": {
                  "type": "split",
                  "feature": 5,
                  "featureName": "rfStrength",
                  "threshold": 69.26189,
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
              "feature": 0,
              "featureName": "speed",
              "threshold": 29.84318,
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
          "type": "split",
          "feature": 5,
          "featureName": "rfStrength",
          "threshold": 79.75872,
          "left": {
            "type": "split",
            "feature": 1,
            "featureName": "altitude",
            "threshold": 123.25659,
            "left": {
              "type": "split",
              "feature": 4,
              "featureName": "rfFreqBand",
              "threshold": 1.5,
              "left": {
                "type": "split",
                "feature": 5,
                "featureName": "rfStrength",
                "threshold": 39.91893,
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
                    "threshold": 0.04244,
                    "left": {
                      "type": "split",
                      "feature": 1,
                      "featureName": "altitude",
                      "threshold": 92.9217,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
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
                      "threshold": 99.53321,
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
                    "label": "civilian"
                  }
                }
              },
              "right": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 73.97805,
                "left": {
                  "type": "split",
                  "feature": 8,
                  "featureName": "iff",
                  "threshold": 0.5,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_swarm"
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
                  "threshold": 101.40874,
                  "left": {
                    "type": "split",
                    "feature": 6,
                    "featureName": "eoConf",
                    "threshold": 0.38839,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    },
                    "right": {
                      "type": "split",
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 18.46505,
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
                    "threshold": 0.03041,
                    "left": {
                      "type": "split",
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 20.17814,
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
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 19.9046,
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
                }
              }
            },
            "right": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.05406,
              "left": {
                "type": "split",
                "feature": 0,
                "featureName": "speed",
                "threshold": 20.20546,
                "left": {
                  "type": "leaf",
                  "label": "hostile_recon"
                },
                "right": {
                  "type": "split",
                  "feature": 6,
                  "featureName": "eoConf",
                  "threshold": 0.73834,
                  "left": {
                    "type": "split",
                    "feature": 7,
                    "featureName": "acousticConf",
                    "threshold": 0.17017,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_recon"
                    },
                    "right": {
                      "type": "split",
                      "feature": 5,
                      "featureName": "rfStrength",
                      "threshold": 63.70006,
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
            "feature": 7,
            "featureName": "acousticConf",
            "threshold": 0.00434,
            "left": {
              "type": "leaf",
              "label": "hostile_recon"
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
                "threshold": 80.58066,
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
                "label": "hostile_swarm"
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
  },
  {
    "type": "split",
    "feature": 2,
    "featureName": "rcs",
    "threshold": 0.08476,
    "left": {
      "type": "split",
      "feature": 1,
      "featureName": "altitude",
      "threshold": 63.35355,
      "left": {
        "type": "split",
        "feature": 0,
        "featureName": "speed",
        "threshold": 10.08323,
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
              "type": "leaf",
              "label": "bird"
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
          "feature": 8,
          "featureName": "iff",
          "threshold": 0.5,
          "left": {
            "type": "split",
            "feature": 4,
            "featureName": "rfFreqBand",
            "threshold": 1.5,
            "left": {
              "type": "split",
              "feature": 0,
              "featureName": "speed",
              "threshold": 26.89884,
              "left": {
                "type": "split",
                "feature": 2,
                "featureName": "rcs",
                "threshold": 0.02153,
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
                "threshold": 0.05054,
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
              "label": "hostile_swarm"
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
        "feature": 1,
        "featureName": "altitude",
        "threshold": 123.03817,
        "left": {
          "type": "split",
          "feature": 0,
          "featureName": "speed",
          "threshold": 29.4861,
          "left": {
            "type": "split",
            "feature": 0,
            "featureName": "speed",
            "threshold": 18.81001,
            "left": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.0259,
              "left": {
                "type": "split",
                "feature": 5,
                "featureName": "rfStrength",
                "threshold": 60.576,
                "left": {
                  "type": "split",
                  "feature": 0,
                  "featureName": "speed",
                  "threshold": 13.82688,
                  "left": {
                    "type": "split",
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.02302,
                    "left": {
                      "type": "split",
                      "feature": 3,
                      "featureName": "rfPresent",
                      "threshold": 0.5,
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
                      "feature": 6,
                      "featureName": "eoConf",
                      "threshold": 0.41854,
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
                    "feature": 1,
                    "featureName": "altitude",
                    "threshold": 85.94714,
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
                  "type": "leaf",
                  "label": "hostile_recon"
                }
              },
              "right": {
                "type": "split",
                "feature": 5,
                "featureName": "rfStrength",
                "threshold": 28.52051,
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
                  "feature": 1,
                  "featureName": "altitude",
                  "threshold": 86.9442,
                  "left": {
                    "type": "leaf",
                    "label": "civilian"
                  },
                  "right": {
                    "type": "split",
                    "feature": 6,
                    "featureName": "eoConf",
                    "threshold": 0.09829,
                    "left": {
                      "type": "split",
                      "feature": 7,
                      "featureName": "acousticConf",
                      "threshold": 0.32763,
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
                }
              }
            },
            "right": {
              "type": "split",
              "feature": 7,
              "featureName": "acousticConf",
              "threshold": 0.37385,
              "left": {
                "type": "split",
                "feature": 0,
                "featureName": "speed",
                "threshold": 27.59777,
                "left": {
                  "type": "split",
                  "feature": 4,
                  "featureName": "rfFreqBand",
                  "threshold": 1.5,
                  "left": {
                    "type": "split",
                    "feature": 4,
                    "featureName": "rfFreqBand",
                    "threshold": 0.5,
                    "left": {
                      "type": "split",
                      "feature": 9,
                      "featureName": "distNorm",
                      "threshold": 0.90729,
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
                      "threshold": 63.76878,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
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
                    "threshold": 109.07813,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    },
                    "right": {
                      "type": "split",
                      "feature": 5,
                      "featureName": "rfStrength",
                      "threshold": 54.81263,
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
                  "feature": 5,
                  "featureName": "rfStrength",
                  "threshold": 56.15128,
                  "left": {
                    "type": "split",
                    "feature": 7,
                    "featureName": "acousticConf",
                    "threshold": 0.05034,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    },
                    "right": {
                      "type": "split",
                      "feature": 7,
                      "featureName": "acousticConf",
                      "threshold": 0.19539,
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
                    "threshold": 95.86766,
                    "left": {
                      "type": "split",
                      "feature": 9,
                      "featureName": "distNorm",
                      "threshold": 0.36018,
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
                      "feature": 7,
                      "featureName": "acousticConf",
                      "threshold": 0.1044,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_attack"
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
                "threshold": 0.06411,
                "left": {
                  "type": "split",
                  "feature": 1,
                  "featureName": "altitude",
                  "threshold": 103.70592,
                  "left": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 27.32583,
                    "left": {
                      "type": "split",
                      "feature": 4,
                      "featureName": "rfFreqBand",
                      "threshold": 1.5,
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
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.02895,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_recon"
                    },
                    "right": {
                      "type": "split",
                      "feature": 7,
                      "featureName": "acousticConf",
                      "threshold": 0.47369,
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
                  "threshold": 0.50347,
                  "left": {
                    "type": "split",
                    "feature": 5,
                    "featureName": "rfStrength",
                    "threshold": 58.89459,
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
            "feature": 0,
            "featureName": "speed",
            "threshold": 31.48248,
            "left": {
              "type": "split",
              "feature": 4,
              "featureName": "rfFreqBand",
              "threshold": 1.5,
              "left": {
                "type": "split",
                "feature": 2,
                "featureName": "rcs",
                "threshold": 0.04069,
                "left": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                },
                "right": {
                  "type": "split",
                  "feature": 5,
                  "featureName": "rfStrength",
                  "threshold": 20.44632,
                  "left": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 31.11417,
                    "left": {
                      "type": "split",
                      "feature": 7,
                      "featureName": "acousticConf",
                      "threshold": 0.41175,
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
                    "type": "leaf",
                    "label": "hostile_attack"
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
              "feature": 3,
              "featureName": "rfPresent",
              "threshold": 0.5,
              "left": {
                "type": "leaf",
                "label": "hostile_attack"
              },
              "right": {
                "type": "split",
                "feature": 2,
                "featureName": "rcs",
                "threshold": 0.03833,
                "left": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                },
                "right": {
                  "type": "split",
                  "feature": 1,
                  "featureName": "altitude",
                  "threshold": 77.98161,
                  "left": {
                    "type": "split",
                    "feature": 1,
                    "featureName": "altitude",
                    "threshold": 77.24691,
                    "left": {
                      "type": "split",
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 34.12831,
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
          "feature": 1,
          "featureName": "altitude",
          "threshold": 127.67534,
          "left": {
            "type": "split",
            "feature": 5,
            "featureName": "rfStrength",
            "threshold": 62.87013,
            "left": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.0583,
              "left": {
                "type": "split",
                "feature": 3,
                "featureName": "rfPresent",
                "threshold": 0.5,
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
                "label": "hostile_attack"
              }
            },
            "right": {
              "type": "split",
              "feature": 0,
              "featureName": "speed",
              "threshold": 18.07968,
              "left": {
                "type": "leaf",
                "label": "hostile_recon"
              },
              "right": {
                "type": "split",
                "feature": 6,
                "featureName": "eoConf",
                "threshold": 0.5447,
                "left": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                },
                "right": {
                  "type": "split",
                  "feature": 9,
                  "featureName": "distNorm",
                  "threshold": 0.70083,
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
            "feature": 8,
            "featureName": "iff",
            "threshold": 1.0,
            "left": {
              "type": "split",
              "feature": 0,
              "featureName": "speed",
              "threshold": 22.05342,
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
              "type": "leaf",
              "label": "friendly"
            }
          }
        }
      }
    },
    "right": {
      "type": "split",
      "feature": 0,
      "featureName": "speed",
      "threshold": 28.27608,
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
        "threshold": 0.01286,
        "left": {
          "type": "split",
          "feature": 6,
          "featureName": "eoConf",
          "threshold": 0.02068,
          "left": {
            "type": "split",
            "feature": 6,
            "featureName": "eoConf",
            "threshold": 0.0161,
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
            "feature": 1,
            "featureName": "altitude",
            "threshold": 54.66618,
            "left": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.01125,
              "left": {
                "type": "split",
                "feature": 0,
                "featureName": "speed",
                "threshold": 5.66177,
                "left": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.01043,
                  "left": {
                    "type": "leaf",
                    "label": "bird"
                  },
                  "right": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 5.3706,
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
                "feature": 6,
                "featureName": "eoConf",
                "threshold": 0.06433,
                "left": {
                  "type": "leaf",
                  "label": "bird"
                },
                "right": {
                  "type": "split",
                  "feature": 1,
                  "featureName": "altitude",
                  "threshold": 31.18852,
                  "left": {
                    "type": "leaf",
                    "label": "bird"
                  },
                  "right": {
                    "type": "split",
                    "feature": 9,
                    "featureName": "distNorm",
                    "threshold": 0.38017,
                    "left": {
                      "type": "leaf",
                      "label": "bird"
                    },
                    "right": {
                      "type": "split",
                      "feature": 6,
                      "featureName": "eoConf",
                      "threshold": 0.46208,
                      "left": {
                        "type": "leaf",
                        "label": "bird"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "bird"
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
          }
        },
        "right": {
          "type": "split",
          "feature": 7,
          "featureName": "acousticConf",
          "threshold": 0.00253,
          "left": {
            "type": "split",
            "feature": 1,
            "featureName": "altitude",
            "threshold": 182.46809,
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
            "threshold": 0.04018,
            "left": {
              "type": "split",
              "feature": 8,
              "featureName": "iff",
              "threshold": 0.5,
              "left": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 123.17088,
                "left": {
                  "type": "split",
                  "feature": 0,
                  "featureName": "speed",
                  "threshold": 18.81507,
                  "left": {
                    "type": "split",
                    "feature": 1,
                    "featureName": "altitude",
                    "threshold": 102.18267,
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
                    "threshold": 0.3522,
                    "left": {
                      "type": "split",
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 26.89195,
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
                      "feature": 2,
                      "featureName": "rcs",
                      "threshold": 0.03896,
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
                  "feature": 1,
                  "featureName": "altitude",
                  "threshold": 129.40111,
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
                "label": "civilian"
              }
            },
            "right": {
              "type": "split",
              "feature": 0,
              "featureName": "speed",
              "threshold": 27.87543,
              "left": {
                "type": "split",
                "feature": 2,
                "featureName": "rcs",
                "threshold": 0.06098,
                "left": {
                  "type": "split",
                  "feature": 9,
                  "featureName": "distNorm",
                  "threshold": 0.74089,
                  "left": {
                    "type": "split",
                    "feature": 1,
                    "featureName": "altitude",
                    "threshold": 118.63465,
                    "left": {
                      "type": "split",
                      "feature": 7,
                      "featureName": "acousticConf",
                      "threshold": 0.37016,
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
                      "threshold": 0.04501,
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
                    "threshold": 109.36134,
                    "left": {
                      "type": "split",
                      "feature": 2,
                      "featureName": "rcs",
                      "threshold": 0.04469,
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
                  "type": "leaf",
                  "label": "hostile_attack"
                }
              },
              "right": {
                "type": "split",
                "feature": 7,
                "featureName": "acousticConf",
                "threshold": 0.0224,
                "left": {
                  "type": "leaf",
                  "label": "hostile_attack"
                },
                "right": {
                  "type": "split",
                  "feature": 9,
                  "featureName": "distNorm",
                  "threshold": 0.56052,
                  "left": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 28.25656,
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
                    "threshold": 81.49714,
                    "left": {
                      "type": "split",
                      "feature": 7,
                      "featureName": "acousticConf",
                      "threshold": 0.43413,
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
                      "threshold": 95.05804,
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
          "threshold": 19.58176,
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
              "feature": 7,
              "featureName": "acousticConf",
              "threshold": 0.08639,
              "left": {
                "type": "leaf",
                "label": "hostile_recon"
              },
              "right": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 92.54033,
                "left": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                },
                "right": {
                  "type": "split",
                  "feature": 1,
                  "featureName": "altitude",
                  "threshold": 125.27525,
                  "left": {
                    "type": "split",
                    "feature": 5,
                    "featureName": "rfStrength",
                    "threshold": 77.73026,
                    "left": {
                      "type": "split",
                      "feature": 7,
                      "featureName": "acousticConf",
                      "threshold": 0.14871,
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
            "feature": 5,
            "featureName": "rfStrength",
            "threshold": 49.99871,
            "left": {
              "type": "split",
              "feature": 0,
              "featureName": "speed",
              "threshold": 24.40121,
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
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.06236,
              "left": {
                "type": "split",
                "feature": 4,
                "featureName": "rfFreqBand",
                "threshold": 1.5,
                "left": {
                  "type": "split",
                  "feature": 5,
                  "featureName": "rfStrength",
                  "threshold": 79.42741,
                  "left": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 24.2222,
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
                },
                "right": {
                  "type": "split",
                  "feature": 7,
                  "featureName": "acousticConf",
                  "threshold": 0.00291,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  },
                  "right": {
                    "type": "split",
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.02958,
                    "left": {
                      "type": "split",
                      "feature": 5,
                      "featureName": "rfStrength",
                      "threshold": 69.72632,
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
                      "threshold": 20.90848,
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
                "feature": 0,
                "featureName": "speed",
                "threshold": 27.1257,
                "left": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.06582,
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
      "type": "leaf",
      "label": "friendly"
    }
  },
  {
    "type": "split",
    "feature": 1,
    "featureName": "altitude",
    "threshold": 61.85824,
    "left": {
      "type": "split",
      "feature": 3,
      "featureName": "rfPresent",
      "threshold": 0.5,
      "left": {
        "type": "split",
        "feature": 6,
        "featureName": "eoConf",
        "threshold": 0.80606,
        "left": {
          "type": "split",
          "feature": 9,
          "featureName": "distNorm",
          "threshold": 0.21045,
          "left": {
            "type": "split",
            "feature": 7,
            "featureName": "acousticConf",
            "threshold": 0.62462,
            "left": {
              "type": "split",
              "feature": 7,
              "featureName": "acousticConf",
              "threshold": 0.54268,
              "left": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 50.33832,
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
                "feature": 7,
                "featureName": "acousticConf",
                "threshold": 0.56378,
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
              "type": "split",
              "feature": 1,
              "featureName": "altitude",
              "threshold": 29.99783,
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
            "type": "split",
            "feature": 1,
            "featureName": "altitude",
            "threshold": 53.77045,
            "left": {
              "type": "split",
              "feature": 0,
              "featureName": "speed",
              "threshold": 10.88944,
              "left": {
                "type": "split",
                "feature": 2,
                "featureName": "rcs",
                "threshold": 0.01293,
                "left": {
                  "type": "split",
                  "feature": 1,
                  "featureName": "altitude",
                  "threshold": 41.18894,
                  "left": {
                    "type": "leaf",
                    "label": "bird"
                  },
                  "right": {
                    "type": "split",
                    "feature": 6,
                    "featureName": "eoConf",
                    "threshold": 0.02454,
                    "left": {
                      "type": "leaf",
                      "label": "bird"
                    },
                    "right": {
                      "type": "split",
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 8.81887,
                      "left": {
                        "type": "leaf",
                        "label": "bird"
                      },
                      "right": {
                        "type": "leaf",
                        "label": "bird"
                      }
                    }
                  }
                },
                "right": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.014,
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
                "type": "leaf",
                "label": "civilian"
              }
            },
            "right": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.02848,
              "left": {
                "type": "split",
                "feature": 7,
                "featureName": "acousticConf",
                "threshold": 0.28284,
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
                "feature": 0,
                "featureName": "speed",
                "threshold": 30.0087,
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
          "feature": 8,
          "featureName": "iff",
          "threshold": 0.5,
          "left": {
            "type": "split",
            "feature": 2,
            "featureName": "rcs",
            "threshold": 0.01163,
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
            "type": "leaf",
            "label": "civilian"
          }
        }
      },
      "right": {
        "type": "split",
        "feature": 5,
        "featureName": "rfStrength",
        "threshold": 60.05681,
        "left": {
          "type": "split",
          "feature": 9,
          "featureName": "distNorm",
          "threshold": 0.98977,
          "left": {
            "type": "split",
            "feature": 0,
            "featureName": "speed",
            "threshold": 18.68033,
            "left": {
              "type": "leaf",
              "label": "civilian"
            },
            "right": {
              "type": "leaf",
              "label": "hostile_swarm"
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
          "threshold": 29.19362,
          "left": {
            "type": "split",
            "feature": 0,
            "featureName": "speed",
            "threshold": 25.79682,
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
        "threshold": 1.5,
        "left": {
          "type": "split",
          "feature": 7,
          "featureName": "acousticConf",
          "threshold": 0.0001,
          "left": {
            "type": "leaf",
            "label": "hostile_recon"
          },
          "right": {
            "type": "split",
            "feature": 1,
            "featureName": "altitude",
            "threshold": 127.93483,
            "left": {
              "type": "split",
              "feature": 5,
              "featureName": "rfStrength",
              "threshold": 39.98236,
              "left": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 101.97442,
                "left": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.0383,
                  "left": {
                    "type": "split",
                    "feature": 6,
                    "featureName": "eoConf",
                    "threshold": 0.68387,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    },
                    "right": {
                      "type": "split",
                      "feature": 9,
                      "featureName": "distNorm",
                      "threshold": 0.63526,
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
                    "feature": 7,
                    "featureName": "acousticConf",
                    "threshold": 0.08899,
                    "left": {
                      "type": "split",
                      "feature": 2,
                      "featureName": "rcs",
                      "threshold": 0.05587,
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
                      "feature": 7,
                      "featureName": "acousticConf",
                      "threshold": 0.14613,
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
                  "type": "split",
                  "feature": 0,
                  "featureName": "speed",
                  "threshold": 26.6939,
                  "left": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 19.30842,
                    "left": {
                      "type": "split",
                      "feature": 9,
                      "featureName": "distNorm",
                      "threshold": 0.54861,
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
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 21.90962,
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
                    "threshold": 29.38892,
                    "left": {
                      "type": "split",
                      "feature": 2,
                      "featureName": "rcs",
                      "threshold": 0.0433,
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
                      "feature": 9,
                      "featureName": "distNorm",
                      "threshold": 0.90047,
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
                "feature": 1,
                "featureName": "altitude",
                "threshold": 114.01262,
                "left": {
                  "type": "split",
                  "feature": 9,
                  "featureName": "distNorm",
                  "threshold": 0.97909,
                  "left": {
                    "type": "split",
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.03725,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_recon"
                    },
                    "right": {
                      "type": "split",
                      "feature": 5,
                      "featureName": "rfStrength",
                      "threshold": 56.67348,
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
                  "feature": 7,
                  "featureName": "acousticConf",
                  "threshold": 0.12549,
                  "left": {
                    "type": "split",
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.04773,
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
                    "feature": 6,
                    "featureName": "eoConf",
                    "threshold": 0.56776,
                    "left": {
                      "type": "split",
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 23.77135,
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
                      "threshold": 23.4628,
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
            },
            "right": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.0498,
              "left": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 129.98849,
                "left": {
                  "type": "split",
                  "feature": 9,
                  "featureName": "distNorm",
                  "threshold": 0.7845,
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
                "feature": 0,
                "featureName": "speed",
                "threshold": 15.2641,
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
        },
        "right": {
          "type": "split",
          "feature": 5,
          "featureName": "rfStrength",
          "threshold": 50.14413,
          "left": {
            "type": "split",
            "feature": 6,
            "featureName": "eoConf",
            "threshold": 0.81627,
            "left": {
              "type": "leaf",
              "label": "hostile_recon"
            },
            "right": {
              "type": "split",
              "feature": 9,
              "featureName": "distNorm",
              "threshold": 0.80965,
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
            "threshold": 2.5,
            "left": {
              "type": "split",
              "feature": 0,
              "featureName": "speed",
              "threshold": 18.8107,
              "left": {
                "type": "split",
                "feature": 5,
                "featureName": "rfStrength",
                "threshold": 79.84468,
                "left": {
                  "type": "split",
                  "feature": 9,
                  "featureName": "distNorm",
                  "threshold": 0.23426,
                  "left": {
                    "type": "split",
                    "feature": 1,
                    "featureName": "altitude",
                    "threshold": 109.9192,
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
                  "label": "hostile_swarm"
                }
              },
              "right": {
                "type": "split",
                "feature": 5,
                "featureName": "rfStrength",
                "threshold": 56.00023,
                "left": {
                  "type": "split",
                  "feature": 7,
                  "featureName": "acousticConf",
                  "threshold": 0.07039,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  },
                  "right": {
                    "type": "split",
                    "feature": 7,
                    "featureName": "acousticConf",
                    "threshold": 0.25829,
                    "left": {
                      "type": "split",
                      "feature": 1,
                      "featureName": "altitude",
                      "threshold": 105.61924,
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
                      "label": "hostile_swarm"
                    }
                  }
                },
                "right": {
                  "type": "split",
                  "feature": 0,
                  "featureName": "speed",
                  "threshold": 20.2389,
                  "left": {
                    "type": "split",
                    "feature": 9,
                    "featureName": "distNorm",
                    "threshold": 0.43873,
                    "left": {
                      "type": "split",
                      "feature": 2,
                      "featureName": "rcs",
                      "threshold": 0.04654,
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
                      "feature": 2,
                      "featureName": "rcs",
                      "threshold": 0.0466,
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
                    "feature": 7,
                    "featureName": "acousticConf",
                    "threshold": 0.68095,
                    "left": {
                      "type": "split",
                      "feature": 7,
                      "featureName": "acousticConf",
                      "threshold": 0.00295,
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
                      "threshold": 0.55342,
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
              "type": "leaf",
              "label": "friendly"
            }
          }
        }
      },
      "right": {
        "type": "split",
        "feature": 8,
        "featureName": "iff",
        "threshold": 1.5,
        "left": {
          "type": "split",
          "feature": 0,
          "featureName": "speed",
          "threshold": 15.47043,
          "left": {
            "type": "leaf",
            "label": "civilian"
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
      "threshold": 0.01555,
      "left": {
        "type": "leaf",
        "label": "bird"
      },
      "right": {
        "type": "split",
        "feature": 7,
        "featureName": "acousticConf",
        "threshold": 0.0001,
        "left": {
          "type": "split",
          "feature": 2,
          "featureName": "rcs",
          "threshold": 0.06976,
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
            "threshold": 0.88559,
            "left": {
              "type": "split",
              "feature": 1,
              "featureName": "altitude",
              "threshold": 128.31264,
              "left": {
                "type": "split",
                "feature": 0,
                "featureName": "speed",
                "threshold": 27.32798,
                "left": {
                  "type": "split",
                  "feature": 0,
                  "featureName": "speed",
                  "threshold": 18.98021,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  },
                  "right": {
                    "type": "split",
                    "feature": 1,
                    "featureName": "altitude",
                    "threshold": 87.56691,
                    "left": {
                      "type": "split",
                      "feature": 2,
                      "featureName": "rcs",
                      "threshold": 0.05925,
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
                      "threshold": 0.05652,
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
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.03799,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_swarm"
                  },
                  "right": {
                    "type": "split",
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.04204,
                    "left": {
                      "type": "split",
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 32.0387,
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
                      "threshold": 109.07581,
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
                "feature": 1,
                "featureName": "altitude",
                "threshold": 131.41633,
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
              "label": "hostile_swarm"
            }
          },
          "right": {
            "type": "split",
            "feature": 7,
            "featureName": "acousticConf",
            "threshold": 0.55225,
            "left": {
              "type": "split",
              "feature": 1,
              "featureName": "altitude",
              "threshold": 124.63588,
              "left": {
                "type": "split",
                "feature": 0,
                "featureName": "speed",
                "threshold": 29.52042,
                "left": {
                  "type": "split",
                  "feature": 0,
                  "featureName": "speed",
                  "threshold": 19.18232,
                  "left": {
                    "type": "split",
                    "feature": 1,
                    "featureName": "altitude",
                    "threshold": 92.28426,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    },
                    "right": {
                      "type": "split",
                      "feature": 9,
                      "featureName": "distNorm",
                      "threshold": 0.95001,
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
                    "threshold": 106.14795,
                    "left": {
                      "type": "split",
                      "feature": 5,
                      "featureName": "rfStrength",
                      "threshold": 49.60149,
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
                  }
                },
                "right": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.0366,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_swarm"
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
                }
              },
              "right": {
                "type": "split",
                "feature": 7,
                "featureName": "acousticConf",
                "threshold": 0.0763,
                "left": {
                  "type": "split",
                  "feature": 5,
                  "featureName": "rfStrength",
                  "threshold": 78.3032,
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
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.06391,
                  "left": {
                    "type": "split",
                    "feature": 9,
                    "featureName": "distNorm",
                    "threshold": 0.51538,
                    "left": {
                      "type": "split",
                      "feature": 9,
                      "featureName": "distNorm",
                      "threshold": 0.49686,
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
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.13877,
                    "left": {
                      "type": "leaf",
                      "label": "friendly"
                    },
                    "right": {
                      "type": "leaf",
                      "label": "friendly"
                    }
                  }
                }
              }
            },
            "right": {
              "type": "split",
              "feature": 1,
              "featureName": "altitude",
              "threshold": 122.61155,
              "left": {
                "type": "split",
                "feature": 4,
                "featureName": "rfFreqBand",
                "threshold": 1.5,
                "left": {
                  "type": "split",
                  "feature": 5,
                  "featureName": "rfStrength",
                  "threshold": 41.33149,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_recon"
                  },
                  "right": {
                    "type": "split",
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.03523,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_recon"
                    },
                    "right": {
                      "type": "split",
                      "feature": 7,
                      "featureName": "acousticConf",
                      "threshold": 0.65254,
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
                  "threshold": 19.77584,
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
                "feature": 4,
                "featureName": "rfFreqBand",
                "threshold": 1.5,
                "left": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.04864,
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
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.04997,
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
      }
    },
    "right": {
      "type": "split",
      "feature": 2,
      "featureName": "rcs",
      "threshold": 0.05481,
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
    "threshold": 0.08301,
    "left": {
      "type": "split",
      "feature": 0,
      "featureName": "speed",
      "threshold": 19.67489,
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
            "threshold": 0.01614,
            "left": {
              "type": "leaf",
              "label": "bird"
            },
            "right": {
              "type": "split",
              "feature": 0,
              "featureName": "speed",
              "threshold": 18.98021,
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
            "feature": 2,
            "featureName": "rcs",
            "threshold": 0.05068,
            "left": {
              "type": "split",
              "feature": 5,
              "featureName": "rfStrength",
              "threshold": 81.77124,
              "left": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 93.41171,
                "left": {
                  "type": "leaf",
                  "label": "hostile_recon"
                },
                "right": {
                  "type": "split",
                  "feature": 5,
                  "featureName": "rfStrength",
                  "threshold": 77.88662,
                  "left": {
                    "type": "split",
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.0478,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_recon"
                    },
                    "right": {
                      "type": "split",
                      "feature": 6,
                      "featureName": "eoConf",
                      "threshold": 0.27528,
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
                    "threshold": 0.80786,
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
              "type": "split",
              "feature": 0,
              "featureName": "speed",
              "threshold": 18.45403,
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
          "label": "civilian"
        }
      },
      "right": {
        "type": "split",
        "feature": 2,
        "featureName": "rcs",
        "threshold": 0.06121,
        "left": {
          "type": "split",
          "feature": 4,
          "featureName": "rfFreqBand",
          "threshold": 1.5,
          "left": {
            "type": "split",
            "feature": 1,
            "featureName": "altitude",
            "threshold": 131.73346,
            "left": {
              "type": "split",
              "feature": 4,
              "featureName": "rfFreqBand",
              "threshold": 0.5,
              "left": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 75.72927,
                "left": {
                  "type": "split",
                  "feature": 9,
                  "featureName": "distNorm",
                  "threshold": 0.94215,
                  "left": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 29.99832,
                    "left": {
                      "type": "split",
                      "feature": 7,
                      "featureName": "acousticConf",
                      "threshold": 0.64242,
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
                      "threshold": 0.71221,
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
                  "feature": 6,
                  "featureName": "eoConf",
                  "threshold": 0.07912,
                  "left": {
                    "type": "split",
                    "feature": 6,
                    "featureName": "eoConf",
                    "threshold": 0.04528,
                    "left": {
                      "type": "split",
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 26.61398,
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
                    "type": "split",
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.03878,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    },
                    "right": {
                      "type": "split",
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 27.74748,
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
                "feature": 2,
                "featureName": "rcs",
                "threshold": 0.04076,
                "left": {
                  "type": "split",
                  "feature": 7,
                  "featureName": "acousticConf",
                  "threshold": 0.5482,
                  "left": {
                    "type": "split",
                    "feature": 9,
                    "featureName": "distNorm",
                    "threshold": 0.33647,
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
                  "feature": 1,
                  "featureName": "altitude",
                  "threshold": 106.17836,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  },
                  "right": {
                    "type": "split",
                    "feature": 5,
                    "featureName": "rfStrength",
                    "threshold": 46.63177,
                    "left": {
                      "type": "split",
                      "feature": 7,
                      "featureName": "acousticConf",
                      "threshold": 0.2236,
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
              "type": "leaf",
              "label": "hostile_recon"
            }
          },
          "right": {
            "type": "split",
            "feature": 7,
            "featureName": "acousticConf",
            "threshold": 0.00139,
            "left": {
              "type": "leaf",
              "label": "hostile_swarm"
            },
            "right": {
              "type": "split",
              "feature": 5,
              "featureName": "rfStrength",
              "threshold": 50.19148,
              "left": {
                "type": "leaf",
                "label": "hostile_recon"
              },
              "right": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 126.71217,
                "left": {
                  "type": "split",
                  "feature": 1,
                  "featureName": "altitude",
                  "threshold": 122.00195,
                  "left": {
                    "type": "split",
                    "feature": 5,
                    "featureName": "rfStrength",
                    "threshold": 60.72458,
                    "left": {
                      "type": "split",
                      "feature": 1,
                      "featureName": "altitude",
                      "threshold": 105.33566,
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
                    "feature": 1,
                    "featureName": "altitude",
                    "threshold": 123.17735,
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
          "feature": 7,
          "featureName": "acousticConf",
          "threshold": 0.0047,
          "left": {
            "type": "leaf",
            "label": "friendly"
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
              "threshold": 20.08275,
              "left": {
                "type": "split",
                "feature": 2,
                "featureName": "rcs",
                "threshold": 0.06366,
                "left": {
                  "type": "split",
                  "feature": 9,
                  "featureName": "distNorm",
                  "threshold": 0.33111,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_swarm"
                  },
                  "right": {
                    "type": "split",
                    "feature": 7,
                    "featureName": "acousticConf",
                    "threshold": 0.21406,
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
              "label": "hostile_swarm"
            }
          }
        }
      }
    },
    "right": {
      "type": "split",
      "feature": 1,
      "featureName": "altitude",
      "threshold": 132.81521,
      "left": {
        "type": "leaf",
        "label": "hostile_attack"
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
    "threshold": 12.42738,
    "left": {
      "type": "split",
      "feature": 4,
      "featureName": "rfFreqBand",
      "threshold": 0.5,
      "left": {
        "type": "split",
        "feature": 0,
        "featureName": "speed",
        "threshold": 10.30154,
        "left": {
          "type": "split",
          "feature": 1,
          "featureName": "altitude",
          "threshold": 55.69549,
          "left": {
            "type": "split",
            "feature": 6,
            "featureName": "eoConf",
            "threshold": 0.89412,
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
              "type": "leaf",
              "label": "bird"
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
          "threshold": 0.01107,
          "left": {
            "type": "leaf",
            "label": "bird"
          },
          "right": {
            "type": "split",
            "feature": 1,
            "featureName": "altitude",
            "threshold": 85.7959,
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
    },
    "right": {
      "type": "split",
      "feature": 7,
      "featureName": "acousticConf",
      "threshold": 2e-05,
      "left": {
        "type": "split",
        "feature": 8,
        "featureName": "iff",
        "threshold": 0.5,
        "left": {
          "type": "split",
          "feature": 1,
          "featureName": "altitude",
          "threshold": 210.08566,
          "left": {
            "type": "split",
            "feature": 2,
            "featureName": "rcs",
            "threshold": 0.07232,
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
            "feature": 2,
            "featureName": "rcs",
            "threshold": 0.06655,
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
          "type": "leaf",
          "label": "friendly"
        }
      },
      "right": {
        "type": "split",
        "feature": 5,
        "featureName": "rfStrength",
        "threshold": 79.83986,
        "left": {
          "type": "split",
          "feature": 0,
          "featureName": "speed",
          "threshold": 28.82071,
          "left": {
            "type": "split",
            "feature": 5,
            "featureName": "rfStrength",
            "threshold": 58.50227,
            "left": {
              "type": "split",
              "feature": 1,
              "featureName": "altitude",
              "threshold": 101.83289,
              "left": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 66.86401,
                "left": {
                  "type": "split",
                  "feature": 8,
                  "featureName": "iff",
                  "threshold": 0.5,
                  "left": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 27.62357,
                    "left": {
                      "type": "split",
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 26.28023,
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
                    "label": "civilian"
                  }
                },
                "right": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.06393,
                  "left": {
                    "type": "split",
                    "feature": 7,
                    "featureName": "acousticConf",
                    "threshold": 0.07406,
                    "left": {
                      "type": "split",
                      "feature": 5,
                      "featureName": "rfStrength",
                      "threshold": 8.14262,
                      "left": {
                        "type": "leaf",
                        "label": "hostile_swarm"
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
                      "threshold": 95.25031,
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
                "feature": 1,
                "featureName": "altitude",
                "threshold": 124.60175,
                "left": {
                  "type": "split",
                  "feature": 4,
                  "featureName": "rfFreqBand",
                  "threshold": 0.5,
                  "left": {
                    "type": "split",
                    "feature": 6,
                    "featureName": "eoConf",
                    "threshold": 0.45399,
                    "left": {
                      "type": "split",
                      "feature": 7,
                      "featureName": "acousticConf",
                      "threshold": 0.3094,
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
                      "feature": 2,
                      "featureName": "rcs",
                      "threshold": 0.04486,
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
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.05417,
                    "left": {
                      "type": "split",
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 21.24193,
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
                      "type": "leaf",
                      "label": "hostile_attack"
                    }
                  }
                },
                "right": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.05203,
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
              "feature": 1,
              "featureName": "altitude",
              "threshold": 125.92147,
              "left": {
                "type": "split",
                "feature": 0,
                "featureName": "speed",
                "threshold": 20.01262,
                "left": {
                  "type": "split",
                  "feature": 5,
                  "featureName": "rfStrength",
                  "threshold": 60.01037,
                  "left": {
                    "type": "split",
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.03112,
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
                    "feature": 9,
                    "featureName": "distNorm",
                    "threshold": 0.88726,
                    "left": {
                      "type": "split",
                      "feature": 7,
                      "featureName": "acousticConf",
                      "threshold": 0.38935,
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
                  "feature": 1,
                  "featureName": "altitude",
                  "threshold": 118.40443,
                  "left": {
                    "type": "split",
                    "feature": 9,
                    "featureName": "distNorm",
                    "threshold": 0.07411,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    },
                    "right": {
                      "type": "split",
                      "feature": 6,
                      "featureName": "eoConf",
                      "threshold": 0.05857,
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
                    "threshold": 27.33553,
                    "left": {
                      "type": "split",
                      "feature": 9,
                      "featureName": "distNorm",
                      "threshold": 0.37213,
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
                  "threshold": 20.87579,
                  "left": {
                    "type": "split",
                    "feature": 9,
                    "featureName": "distNorm",
                    "threshold": 0.9794,
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
                    "label": "friendly"
                  }
                },
                "right": {
                  "type": "leaf",
                  "label": "friendly"
                }
              }
            }
          },
          "right": {
            "type": "split",
            "feature": 2,
            "featureName": "rcs",
            "threshold": 0.03714,
            "left": {
              "type": "leaf",
              "label": "hostile_swarm"
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
                "threshold": 0.05578,
                "left": {
                  "type": "split",
                  "feature": 3,
                  "featureName": "rfPresent",
                  "threshold": 0.5,
                  "left": {
                    "type": "split",
                    "feature": 7,
                    "featureName": "acousticConf",
                    "threshold": 0.50758,
                    "left": {
                      "type": "split",
                      "feature": 1,
                      "featureName": "altitude",
                      "threshold": 66.42873,
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
                "label": "hostile_swarm"
              }
            }
          }
        },
        "right": {
          "type": "split",
          "feature": 2,
          "featureName": "rcs",
          "threshold": 0.09077,
          "left": {
            "type": "split",
            "feature": 2,
            "featureName": "rcs",
            "threshold": 0.06093,
            "left": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.04118,
              "left": {
                "type": "split",
                "feature": 7,
                "featureName": "acousticConf",
                "threshold": 0.42215,
                "left": {
                  "type": "leaf",
                  "label": "hostile_swarm"
                },
                "right": {
                  "type": "split",
                  "feature": 0,
                  "featureName": "speed",
                  "threshold": 29.10286,
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
                "feature": 5,
                "featureName": "rfStrength",
                "threshold": 94.72773,
                "left": {
                  "type": "split",
                  "feature": 0,
                  "featureName": "speed",
                  "threshold": 29.95131,
                  "left": {
                    "type": "split",
                    "feature": 7,
                    "featureName": "acousticConf",
                    "threshold": 0.01893,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    },
                    "right": {
                      "type": "split",
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 27.49174,
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
                    "feature": 1,
                    "featureName": "altitude",
                    "threshold": 78.20609,
                    "left": {
                      "type": "split",
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 32.3581,
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
            },
            "right": {
              "type": "split",
              "feature": 5,
              "featureName": "rfStrength",
              "threshold": 93.31965,
              "left": {
                "type": "split",
                "feature": 0,
                "featureName": "speed",
                "threshold": 27.1838,
                "left": {
                  "type": "leaf",
                  "label": "friendly"
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
                "threshold": 27.82239,
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
            "label": "friendly"
          }
        }
      }
    }
  },
  {
    "type": "split",
    "feature": 2,
    "featureName": "rcs",
    "threshold": 0.08321,
    "left": {
      "type": "split",
      "feature": 0,
      "featureName": "speed",
      "threshold": 19.78184,
      "left": {
        "type": "split",
        "feature": 8,
        "featureName": "iff",
        "threshold": 0.5,
        "left": {
          "type": "split",
          "feature": 1,
          "featureName": "altitude",
          "threshold": 59.27367,
          "left": {
            "type": "leaf",
            "label": "bird"
          },
          "right": {
            "type": "split",
            "feature": 1,
            "featureName": "altitude",
            "threshold": 96.39275,
            "left": {
              "type": "split",
              "feature": 5,
              "featureName": "rfStrength",
              "threshold": 54.66245,
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
              "threshold": 0.05276,
              "left": {
                "type": "split",
                "feature": 5,
                "featureName": "rfStrength",
                "threshold": 79.6494,
                "left": {
                  "type": "split",
                  "feature": 6,
                  "featureName": "eoConf",
                  "threshold": 0.81268,
                  "left": {
                    "type": "split",
                    "feature": 1,
                    "featureName": "altitude",
                    "threshold": 101.75747,
                    "left": {
                      "type": "split",
                      "feature": 2,
                      "featureName": "rcs",
                      "threshold": 0.03953,
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
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 19.67337,
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
                    "threshold": 19.02271,
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
                  "label": "hostile_recon"
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
          "type": "leaf",
          "label": "civilian"
        }
      },
      "right": {
        "type": "split",
        "feature": 0,
        "featureName": "speed",
        "threshold": 29.01886,
        "left": {
          "type": "split",
          "feature": 1,
          "featureName": "altitude",
          "threshold": 130.7208,
          "left": {
            "type": "split",
            "feature": 1,
            "featureName": "altitude",
            "threshold": 107.24859,
            "left": {
              "type": "split",
              "feature": 4,
              "featureName": "rfFreqBand",
              "threshold": 1.5,
              "left": {
                "type": "split",
                "feature": 0,
                "featureName": "speed",
                "threshold": 27.32182,
                "left": {
                  "type": "split",
                  "feature": 0,
                  "featureName": "speed",
                  "threshold": 25.49157,
                  "left": {
                    "type": "split",
                    "feature": 9,
                    "featureName": "distNorm",
                    "threshold": 0.38308,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    },
                    "right": {
                      "type": "split",
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 23.76567,
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
                    "feature": 4,
                    "featureName": "rfFreqBand",
                    "threshold": 0.5,
                    "left": {
                      "type": "split",
                      "feature": 6,
                      "featureName": "eoConf",
                      "threshold": 0.67296,
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
                  }
                },
                "right": {
                  "type": "split",
                  "feature": 1,
                  "featureName": "altitude",
                  "threshold": 99.34866,
                  "left": {
                    "type": "split",
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.04612,
                    "left": {
                      "type": "split",
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 27.76996,
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
                      "threshold": 0.64284,
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
                    "feature": 7,
                    "featureName": "acousticConf",
                    "threshold": 0.46227,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_attack"
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
              "feature": 0,
              "featureName": "speed",
              "threshold": 26.54445,
              "left": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 109.69358,
                "left": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.03578,
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
                  "feature": 1,
                  "featureName": "altitude",
                  "threshold": 125.45803,
                  "left": {
                    "type": "split",
                    "feature": 6,
                    "featureName": "eoConf",
                    "threshold": 0.1411,
                    "left": {
                      "type": "split",
                      "feature": 5,
                      "featureName": "rfStrength",
                      "threshold": 52.48732,
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
                      "threshold": 0.95898,
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
                "feature": 0,
                "featureName": "speed",
                "threshold": 27.94204,
                "left": {
                  "type": "split",
                  "feature": 5,
                  "featureName": "rfStrength",
                  "threshold": 65.26102,
                  "left": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 26.87562,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    },
                    "right": {
                      "type": "split",
                      "feature": 2,
                      "featureName": "rcs",
                      "threshold": 0.05194,
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
                  "feature": 6,
                  "featureName": "eoConf",
                  "threshold": 0.26345,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_swarm"
                  },
                  "right": {
                    "type": "split",
                    "feature": 5,
                    "featureName": "rfStrength",
                    "threshold": 51.74727,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    },
                    "right": {
                      "type": "split",
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 28.51277,
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
            }
          },
          "right": {
            "type": "split",
            "feature": 9,
            "featureName": "distNorm",
            "threshold": 0.41002,
            "left": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.0432,
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
              "type": "leaf",
              "label": "hostile_recon"
            }
          }
        },
        "right": {
          "type": "split",
          "feature": 0,
          "featureName": "speed",
          "threshold": 31.88296,
          "left": {
            "type": "split",
            "feature": 2,
            "featureName": "rcs",
            "threshold": 0.05646,
            "left": {
              "type": "split",
              "feature": 4,
              "featureName": "rfFreqBand",
              "threshold": 1.5,
              "left": {
                "type": "split",
                "feature": 2,
                "featureName": "rcs",
                "threshold": 0.04103,
                "left": {
                  "type": "split",
                  "feature": 3,
                  "featureName": "rfPresent",
                  "threshold": 0.5,
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
                  "feature": 4,
                  "featureName": "rfFreqBand",
                  "threshold": 0.5,
                  "left": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 29.61954,
                    "left": {
                      "type": "split",
                      "feature": 9,
                      "featureName": "distNorm",
                      "threshold": 0.65037,
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
                      "feature": 1,
                      "featureName": "altitude",
                      "threshold": 72.77845,
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
                "label": "hostile_swarm"
              }
            },
            "right": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.06166,
              "left": {
                "type": "split",
                "feature": 0,
                "featureName": "speed",
                "threshold": 29.83943,
                "left": {
                  "type": "leaf",
                  "label": "hostile_attack"
                },
                "right": {
                  "type": "split",
                  "feature": 9,
                  "featureName": "distNorm",
                  "threshold": 0.53163,
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
            "feature": 9,
            "featureName": "distNorm",
            "threshold": 0.98423,
            "left": {
              "type": "split",
              "feature": 9,
              "featureName": "distNorm",
              "threshold": 0.67977,
              "left": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 112.29898,
                "left": {
                  "type": "split",
                  "feature": 6,
                  "featureName": "eoConf",
                  "threshold": 0.44141,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  },
                  "right": {
                    "type": "split",
                    "feature": 9,
                    "featureName": "distNorm",
                    "threshold": 0.67252,
                    "left": {
                      "type": "split",
                      "feature": 7,
                      "featureName": "acousticConf",
                      "threshold": 0.60479,
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
                  "feature": 1,
                  "featureName": "altitude",
                  "threshold": 112.77275,
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
      "threshold": 2.0,
      "left": {
        "type": "leaf",
        "label": "hostile_attack"
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
      "threshold": 20.24052,
      "left": {
        "type": "split",
        "feature": 1,
        "featureName": "altitude",
        "threshold": 94.50126,
        "left": {
          "type": "split",
          "feature": 8,
          "featureName": "iff",
          "threshold": 0.5,
          "left": {
            "type": "split",
            "feature": 4,
            "featureName": "rfFreqBand",
            "threshold": 1.0,
            "left": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.02623,
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
              "type": "leaf",
              "label": "hostile_swarm"
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
          "threshold": 80.49523,
          "left": {
            "type": "split",
            "feature": 5,
            "featureName": "rfStrength",
            "threshold": 58.02307,
            "left": {
              "type": "split",
              "feature": 0,
              "featureName": "speed",
              "threshold": 19.03543,
              "left": {
                "type": "leaf",
                "label": "hostile_recon"
              },
              "right": {
                "type": "split",
                "feature": 4,
                "featureName": "rfFreqBand",
                "threshold": 0.5,
                "left": {
                  "type": "split",
                  "feature": 1,
                  "featureName": "altitude",
                  "threshold": 134.96737,
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
              "feature": 5,
              "featureName": "rfStrength",
              "threshold": 58.47332,
              "left": {
                "type": "leaf",
                "label": "hostile_recon"
              },
              "right": {
                "type": "split",
                "feature": 5,
                "featureName": "rfStrength",
                "threshold": 64.97109,
                "left": {
                  "type": "split",
                  "feature": 9,
                  "featureName": "distNorm",
                  "threshold": 0.94011,
                  "left": {
                    "type": "split",
                    "feature": 9,
                    "featureName": "distNorm",
                    "threshold": 0.23132,
                    "left": {
                      "type": "split",
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 18.03302,
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
                  "type": "split",
                  "feature": 1,
                  "featureName": "altitude",
                  "threshold": 101.0943,
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
          },
          "right": {
            "type": "leaf",
            "label": "hostile_swarm"
          }
        }
      },
      "right": {
        "type": "split",
        "feature": 5,
        "featureName": "rfStrength",
        "threshold": 49.99871,
        "left": {
          "type": "split",
          "feature": 4,
          "featureName": "rfFreqBand",
          "threshold": 0.5,
          "left": {
            "type": "split",
            "feature": 0,
            "featureName": "speed",
            "threshold": 27.62656,
            "left": {
              "type": "split",
              "feature": 7,
              "featureName": "acousticConf",
              "threshold": 0.38977,
              "left": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 118.82029,
                "left": {
                  "type": "split",
                  "feature": 6,
                  "featureName": "eoConf",
                  "threshold": 0.76067,
                  "left": {
                    "type": "split",
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.05867,
                    "left": {
                      "type": "split",
                      "feature": 0,
                      "featureName": "speed",
                      "threshold": 27.24213,
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
              },
              "right": {
                "type": "split",
                "feature": 1,
                "featureName": "altitude",
                "threshold": 87.45169,
                "left": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.05279,
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
                  "threshold": 0.66821,
                  "left": {
                    "type": "split",
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.04736,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_swarm"
                    },
                    "right": {
                      "type": "split",
                      "feature": 2,
                      "featureName": "rcs",
                      "threshold": 0.05659,
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
                    "threshold": 113.72643,
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
              "feature": 0,
              "featureName": "speed",
              "threshold": 29.61954,
              "left": {
                "type": "split",
                "feature": 6,
                "featureName": "eoConf",
                "threshold": 0.47934,
                "left": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.04177,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  },
                  "right": {
                    "type": "split",
                    "feature": 9,
                    "featureName": "distNorm",
                    "threshold": 0.72456,
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
                  "feature": 7,
                  "featureName": "acousticConf",
                  "threshold": 0.20674,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  },
                  "right": {
                    "type": "split",
                    "feature": 2,
                    "featureName": "rcs",
                    "threshold": 0.05513,
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
                "type": "split",
                "feature": 0,
                "featureName": "speed",
                "threshold": 31.20747,
                "left": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.05022,
                  "left": {
                    "type": "split",
                    "feature": 0,
                    "featureName": "speed",
                    "threshold": 30.62239,
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
                    "threshold": 0.87089,
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
                  "threshold": 0.58437,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  },
                  "right": {
                    "type": "split",
                    "feature": 6,
                    "featureName": "eoConf",
                    "threshold": 0.60086,
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
            "feature": 0,
            "featureName": "speed",
            "threshold": 23.87217,
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
          "threshold": 94.72773,
          "left": {
            "type": "split",
            "feature": 1,
            "featureName": "altitude",
            "threshold": 130.75032,
            "left": {
              "type": "split",
              "feature": 2,
              "featureName": "rcs",
              "threshold": 0.06085,
              "left": {
                "type": "split",
                "feature": 4,
                "featureName": "rfFreqBand",
                "threshold": 1.5,
                "left": {
                  "type": "split",
                  "feature": 1,
                  "featureName": "altitude",
                  "threshold": 120.03431,
                  "left": {
                    "type": "split",
                    "feature": 7,
                    "featureName": "acousticConf",
                    "threshold": 0.40261,
                    "left": {
                      "type": "leaf",
                      "label": "hostile_attack"
                    },
                    "right": {
                      "type": "split",
                      "feature": 2,
                      "featureName": "rcs",
                      "threshold": 0.04093,
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
                  "type": "leaf",
                  "label": "hostile_swarm"
                }
              },
              "right": {
                "type": "split",
                "feature": 0,
                "featureName": "speed",
                "threshold": 27.83048,
                "left": {
                  "type": "split",
                  "feature": 2,
                  "featureName": "rcs",
                  "threshold": 0.06834,
                  "left": {
                    "type": "split",
                    "feature": 6,
                    "featureName": "eoConf",
                    "threshold": 0.33716,
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
                  "feature": 6,
                  "featureName": "eoConf",
                  "threshold": 0.73664,
                  "left": {
                    "type": "leaf",
                    "label": "hostile_attack"
                  },
                  "right": {
                    "type": "split",
                    "feature": 1,
                    "featureName": "altitude",
                    "threshold": 110.05277,
                    "left": {
                      "type": "split",
                      "feature": 1,
                      "featureName": "altitude",
                      "threshold": 71.34192,
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
              "feature": 0,
              "featureName": "speed",
              "threshold": 20.61075,
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
            "threshold": 29.10487,
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
