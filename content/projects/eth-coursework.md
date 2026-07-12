# ETH Zürich ML Coursework (2025–2026)

Graded course projects from the M.Sc. — Advanced Machine Learning, Probabilistic Artificial Intelligence, and Image Analysis & Computer Vision — compiled from the local project folders. No grades or leaderboard scores were recorded in the files; none are stated here.

## Advanced Machine Learning

**Task 1 — Tabular regression with automated preprocessing search** (`AML/PROJECT 1/task1_aml`)
- Regression on a tabular dataset with missing values and outliers, evaluated by R² (cross-validated with `r2_score`).
- Built a configurable preprocessing pipeline: KNN/mean/median imputation, Isolation-Forest outlier removal, custom collinearity and uncorrelated-feature filters (`transforms.py`).
- Ran a randomized hyperparameter search over preprocessing configs and models (XGBoost, CatBoost, GP regression, SVM, linear models), logged to TensorBoard, with the top configurations intended for a stacking regressor.

**Task 2 — Mitral valve segmentation in echocardiography videos** (`AML/task2_aml`, data + trained model in `AML/PRJ3`)
- Semantic segmentation of the mitral valve in ultrasound video (112×112 frames, "amateur" and "expert" subsets with box and per-frame label annotations in `train.pkl`/`test.pkl`).
- Implemented an offline preprocessing pipeline plus several segmentation architectures: U-Net variants (SE blocks, residual, temporal-conditioned), a ViT segmentation head, and DINOv3 feature propagation for pseudo-labels (`mv_segmentation_with_dinov3.ipynb`, `dino_feature_store.py`).
- Extras in the repo: robust NMF for background/valve separation, data augmentation (elastic deformation), frame filtering after anomaly detection, and a trained checkpoint (`PRJ3/model.pth`).
- This coursework project is the basis of the standalone "DINOv3 for Mitral Valve Segmentation" CV entry.

(`AML/TASK0.py` is a warm-up random-forest baseline script; not a graded project of substance.)

## Probabilistic AI

**Project 1 — Exact Bayesian inference over a hypothesis space** (`PAI/PRJ1`)
- Computed log-posterior probabilities over three candidate data-generating distributions (Normal, Laplace, Student-t) given i.i.d. samples, using log-sum-exp normalization for numerical stability.

**Project 2 — Gaussian Process regression for air-pollution prediction** (`PAI/PRJ2`)
- GP regression on 2D city coordinates with a composed kernel (RBF + White + ExpSineSquared, scikit-learn `GaussianProcessRegressor`), trained on a subsample for tractability.
- Predictions adjusted with the GP posterior stddev in residential areas to handle an asymmetric cost that penalizes underprediction 50×.

**Project 3 — SWAG for calibrated image classification** (`PAI/PRJ3`)
- Implemented SWA-Gaussian (SWAG) inference on top of a MAP-trained CNN for satellite-image classification with ambiguous classes (snow/cloud metadata), including calibration on a validation set and reliability diagrams.

**Task 4 — Off-policy actor-critic RL on continuous cart-pole** (`PAI/task4_handout`)
- Implemented a Gaussian stochastic actor and twin Q-critics (MLPs) with target networks and Polyak averaging for an off-policy actor-critic agent (SAC-style) on a continuous-action cart-pole swing-up (`CustomCartpole`, 200-step episodes, replay buffer).
- The local copy of the training loop is partially complete (some loss terms still stubbed).

## Image Analysis & Computer Vision

**Ex. 1 — PCA image compression** (`IAACV/ex1`)
- Learned an eigenbasis codebook via SVD on mean-centered training images; compression/reconstruction from the top-k principal components, plus a NumPy-only median smoothing filter.

**Ex. 2 — Interactive scribble-based segmentation** (`IAACV/ex2_segmentation`)
- Foreground/background segmentation from user scribbles: k-means codebooks (implemented from scratch) over color + spatially-weighted patch features, with kNN assignment of pixels to foreground or background.

**Ex. 3 — Stereo 3D reconstruction** (`IAACV/ex3`)
- Camera calibration (estimating kx, ky, focal length, baseline), patch-based stereo matching, and triangulation to produce a dense depth map and 3D point cloud.

**Ex. 4 — CNN image classification from scratch** (`IAACV/ex4_dl_classification`)
- Designed and trained a PyTorch CNN (conv/pool/FC stack) for 6-class scene classification (buildings, forests, mountains, glacier, sea, street) on 50×50 RGB images, including the data pipeline and augmentation transforms.

**Ex. 5 — Transfer learning with limited data** (`IAACV/ex5_dl_transfer_learning`)
- 10-class classification of 32×32 RGB images with only 210 samples per class, using a ResNet-style network (basic residual blocks) and a pretrained checkpoint fine-tuned on the small dataset.
