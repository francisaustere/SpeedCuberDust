import { PhysicsEntity, Platform, Rect, CollisionLayer } from '../../../types';

export class EnemyPhysics {
    public state: PhysicsEntity;
    public platforms: Platform[];

    // Config
    public gravity: number = 0.8;
    public maxFallSpeed: number = 20;

    // State
    public ignorePlatformId: number | null = null;
    public ignoreTimer: number = 0;
    public currentPlatformId: number | null = null;

    // Smart logging
    private lastLoggedPlatformId: number | null = null;

    // Hysteresis pour éviter les pertes frame-to-frame
    private platformLossTimer: number = 0;
    private platformLossGracePeriod: number = 0.15; // 9 frames à 60 FPS

    constructor(state: PhysicsEntity, platforms: Platform[]) {
        this.state = state;
        this.platforms = platforms;
    }

    public update(dt: number) {
        // Timer-based cleanup for ignore list
        if (this.ignoreTimer > 0) {
            this.ignoreTimer -= dt;
            if (this.ignoreTimer <= 0) {
                this.ignorePlatformId = null;
            }
        }

        // Validate ignore ID (clear if no longer overlapping)
        if (this.ignorePlatformId !== null) {
            const p = this.platforms.find(pl => pl.id === this.ignorePlatformId);
            if (!p || !this.checkOverlap(this.state, p)) {
                this.ignorePlatformId = null;
                this.ignoreTimer = 0;
            }
        }

        // Gravity (only apply when not grounded)
        if (!this.state.isGrounded) {
            this.state.vy += this.gravity;
            if (this.state.vy > this.maxFallSpeed) this.state.vy = this.maxFallSpeed;
        }

        // console.log(`⬇️ [EnemyPhysics] Gravity applied:`, {
        //     vy: this.state.vy.toFixed(2),
        //     gravity: this.gravity,
        //     maxFallSpeed: this.maxFallSpeed
        // });

        // Reset wall state before physics resolution
        this.state.onWall = false;
        this.state.wallNormal.x = 0;
        this.state.wallNormal.y = 0;

        // Continuous Platform Check
        this.updateCurrentPlatform();

        // Platform Carry
        if (this.state.isGrounded && this.currentPlatformId !== null) {
            const p = this.platforms.find(pl => pl.id === this.currentPlatformId);
            if (p) {
                if (p.currentVx) this.state.x += p.currentVx;
                if (p.currentVy) this.state.y += p.currentVy;
            }
        }

        // X Axis
        this.state.x += this.state.vx;
        this.resolveCollisions(true);

        // Y Axis
        this.state.y += this.state.vy;
        this.resolveCollisions(false);
    }

    private updateCurrentPlatform() {
        const bottom = this.state.y + this.state.h;

        let platformDetected = false;

        // Optimization: Check current platform first
        if (this.currentPlatformId !== null) {
            const p = this.platforms.find(pl => pl.id === this.currentPlatformId);
            if (p) {
                const tolerance = this.calculateTolerance(p);
                const distanceToTop = Math.abs(bottom - p.y);

                // 🆕 Vérifier l'overlap horizontal (comme resolveCollisions)
                const hasOverlapX = (this.state.x + this.state.w > p.x) && (this.state.x < p.x + p.w);

                // console.log(`🔎 [updateCurrentPlatform] Checking current platform:`, {
                //     platformId: p.id,
                //     platformX: p.x.toFixed(1),
                //     platformRight: (p.x + p.w).toFixed(1),
                //     platformY: p.y.toFixed(1),
                //     enemyLeft: this.state.x.toFixed(1),
                //     enemyRight: (this.state.x + this.state.w).toFixed(1),
                //     bottom: bottom.toFixed(1),
                //     distanceToTop: distanceToTop.toFixed(1),
                //     tolerance: tolerance.toFixed(1),
                //     hasOverlapX: hasOverlapX,
                //     inRangeY: (distanceToTop <= tolerance)
                // });

                if (hasOverlapX && Math.abs(bottom - p.y) <= tolerance) {
                    // Plateforme toujours détectée
                    platformDetected = true;
                    this.platformLossTimer = 0;

                    // SI ON EST AU-DESSUS DE LA PLATEFORME, ON EST GROUNDED
                    if (bottom <= p.y + tolerance && this.state.vy >= 0) {
                        this.state.isGrounded = true;
                    }

                    // console.log(`✅ [updateCurrentPlatform] Platform KEPT`);
                    return;
                } else {
                    // console.log(`❌ [updateCurrentPlatform] Platform check FAILED`);
                }
            }
        }

        // Search for new platform if we lost the old one or didn't have one
        if (this.state.isGrounded || this.state.vy >= 0) {
            for (const p of this.platforms) {
                if (p.type === 'vanishing' && p.isVanished) continue;
                const layer = p.layer !== undefined ? p.layer : CollisionLayer.SOLID;
                if ((this.state.mask & layer) === 0) continue;

                const searchTolerance = this.calculateTolerance(p);

                // 🆕 Vérifier l'overlap horizontal
                const hasOverlapX = (this.state.x + this.state.w > p.x) && (this.state.x < p.x + p.w);

                if (hasOverlapX && Math.abs(bottom - p.y) <= searchTolerance) {
                    // Nouvelle plateforme détectée
                    if (this.lastLoggedPlatformId !== p.id) {
                        // console.log('🟢 [EnemyPhysics] Platform detected:', p.id,
                        //     'moving:', !!(p.moving || p.type === 'moving'),
                        //     'tolerance:', searchTolerance.toFixed(1));
                        this.lastLoggedPlatformId = p.id;
                    }
                    this.currentPlatformId = p.id;
                    this.platformLossTimer = 0;
                    platformDetected = true;

                    // SI ON EST AU-DESSUS, ON EST GROUNDED
                    if (bottom <= p.y + searchTolerance && this.state.vy >= 0) {
                        this.state.isGrounded = true;
                    }
                    return;
                }
            }
        }

        // HYSTERESIS : Ne perds pas la plateforme immédiatement
        if (!platformDetected && this.currentPlatformId !== null) {
            this.platformLossTimer += 1 / 60; // Assume 60 FPS

            if (this.platformLossTimer < this.platformLossGracePeriod) {
                // Période de grâce : on garde la plateforme
                return;
            }

            // Timeout atteint : on perd vraiment la plateforme
            if (this.lastLoggedPlatformId !== null) {
                // console.log('🔴 [EnemyPhysics] Platform LOST (timeout):', this.currentPlatformId,
                //     'after', (this.platformLossTimer * 60).toFixed(0), 'frames');
                this.lastLoggedPlatformId = null;
            }
            this.currentPlatformId = null;
            this.platformLossTimer = 0;
        }
    }

    private calculateTolerance(platform: Platform): number {
        const baseTolerance = 10;
        const isMoving = !!(platform.moving || platform.type === 'moving');

        if (!isMoving) {
            return baseTolerance;
        }

        let velocityY = 0;
        if (platform.velocityY !== undefined) {
            velocityY = platform.velocityY;
        }

        const velocityBuffer = velocityY * 1.5;
        const finalTolerance = Math.max(25, baseTolerance + velocityBuffer);

        return Math.min(finalTolerance, 50);
    }

    public resolveCollisions(isX: boolean) {
        if (!isX) {
            // Ne reset pas isGrounded si on a une plateforme courante valide
            if (this.currentPlatformId === null) {
                this.state.isGrounded = false;
            }
        }

        for (const p of this.platforms) {
            const layer = p.layer !== undefined ? p.layer : CollisionLayer.SOLID;
            if ((this.state.mask & layer) === 0) continue;

            if (p.type === 'vanishing' && p.isVanished) continue;
            if (p.id === this.ignorePlatformId) continue;

            if (this.checkOverlap(this.state, p)) {
                const overlapX = (Math.min(this.state.x + this.state.w, p.x + p.w) - Math.max(this.state.x, p.x));
                const overlapY = (Math.min(this.state.y + this.state.h, p.y + p.h) - Math.max(this.state.y, p.y));

                const isVerticalCollision = overlapX < overlapY;
                const isSignificantVerticalOverlap = overlapY > 2.0;

                // 🆕 Détection de collision marginale (edge case)
                const isMarginalOverlap = overlapX < 15; // moins de 15px de overlap horizontal
                const isMovingFast = Math.abs(this.state.vy) > 15;
                const isLikelyEdgeHit = isMarginalOverlap && isMovingFast && this.state.vy > 0;

                if (!isX && this.state.vy > 0) {
                    // console.log(`🔍 [EnemyPhysics] Landing check:`, {
                    //     platformId: p.id,
                    //     overlapX: overlapX.toFixed(1),
                    //     overlapY: overlapY.toFixed(1),
                    //     isVerticalCollision,
                    //     isMarginalOverlap,
                    //     isLikelyEdgeHit,
                    //     enemyBottom: (this.state.y + this.state.h).toFixed(1),
                    //     platformTop: p.y.toFixed(1),
                    //     enemyX: this.state.x.toFixed(1),
                    //     enemyRight: (this.state.x + this.state.w).toFixed(1),
                    //     platformLeft: p.x.toFixed(1),
                    //     platformRight: (p.x + p.w).toFixed(1),
                    //     vy: this.state.vy.toFixed(2)
                    // });
                }

                // ============================================
                // RÉSOLUTION HORIZONTALE (X axis)
                // ============================================
                if (isX) {
                    if (isVerticalCollision || isSignificantVerticalOverlap) {
                        if (this.state.vx > 0) {
                            this.state.x = p.x - this.state.w;
                            this.state.wallNormal.x = -1;
                            this.state.wallNormal.y = 0;
                        } else if (this.state.vx < 0) {
                            this.state.x = p.x + p.w;
                            this.state.wallNormal.x = 1;
                            this.state.wallNormal.y = 0;
                        }
                        this.state.vx = 0;
                        this.state.onWall = true;

                        // console.log(`🚫 [EnemyPhysics] WALL HIT:`, {
                        //     platformId: p.id,
                        //     side: this.state.vx > 0 ? 'LEFT' : 'RIGHT'
                        // });
                    }
                }
                // ============================================
                // RÉSOLUTION VERTICALE (Y axis)
                // ============================================
                else {
                    // 🆕 CAS 1 : Collision marginale = traiter comme wall hit
                    if (isLikelyEdgeHit) {
                        // console.log(`⚠️ [EnemyPhysics] EDGE HIT detected (marginal overlap), treating as WALL HIT`, {
                        //     platformId: p.id,
                        //     overlapX: overlapX.toFixed(1),
                        //     overlapY: overlapY.toFixed(1)
                        // });

                        // Déterminer de quel côté on est
                        const enemyCenter = this.state.x + this.state.w / 2;
                        const platformCenter = p.x + p.w / 2;

                        if (enemyCenter < platformCenter) {
                            // On est à gauche, repousser à gauche
                            this.state.x = p.x - this.state.w - 1;
                            // console.log(`  → Pushed LEFT from edge`);
                        } else {
                            // On est à droite, repousser à droite
                            this.state.x = p.x + p.w + 1;
                            // console.log(`  → Pushed RIGHT from edge`);
                        }

                        // Garder la chute
                        // Ne pas set isGrounded = true
                        // Ne pas changer vy pour que la gravité continue
                        continue; // Important : ne pas traiter comme atterrissage
                    }

                    // 🆕 CAS 2 : Atterrissage normal (overlapX suffisant + distance verticale raisonnable)
                    if (!isVerticalCollision) {
                        if (this.state.vy > 0) {
                            // 🆕 NOUVELLE CONDITION : Vérifier la distance verticale réelle
                            const enemyBottom = this.state.y + this.state.h;
                            const verticalDistance = Math.abs(enemyBottom - p.y);
                            const maxLandingDistance = 25; // Tolérance max pour un landing valide (ajustable)

                            // 🆕 Seulement accepter le landing si l'ennemi est vraiment proche du top de la plateforme
                            if (verticalDistance <= maxLandingDistance) {
                                // Atterrissage depuis le haut (VALIDE)
                                this.state.y = p.y - this.state.h;
                                this.state.isGrounded = true;
                                this.state.vy = 0;
                                this.currentPlatformId = p.id;

                                // Ledge forgiveness : si trop près du bord, repousser vers le centre
                                const distFromLeftEdge = this.state.x - p.x;
                                const distFromRightEdge = (p.x + p.w) - (this.state.x + this.state.w);
                                const edgeThreshold = 10;

                                if (distFromLeftEdge < edgeThreshold && distFromLeftEdge >= 0) {
                                    this.state.x += (edgeThreshold - distFromLeftEdge + 2);
                                    // console.log(`🛡️ [Ledge forgiveness] Pushed away from LEFT edge (+${(edgeThreshold - distFromLeftEdge + 2).toFixed(1)}px)`);
                                }
                                else if (distFromRightEdge < edgeThreshold && distFromRightEdge >= 0) {
                                    this.state.x -= (edgeThreshold - distFromRightEdge + 2);
                                    // console.log(`🛡️ [Ledge forgiveness] Pushed away from RIGHT edge (-${(edgeThreshold - distFromRightEdge + 2).toFixed(1)}px)`);
                                }

                                // console.log(`✅ [EnemyPhysics] LANDED on platform:`, p.id);
                            } else {
                                // ✅ Distance trop grande : ce n'est PAS un landing valide
                                // console.log(`⚠️ [EnemyPhysics] LANDING REJECTED (too far):`, {
                                //     platformId: p.id,
                                //     verticalDistance: verticalDistance.toFixed(1),
                                //     maxAllowed: maxLandingDistance,
                                //     enemyBottom: enemyBottom.toFixed(1),
                                //     platformTop: p.y.toFixed(1)
                                // });

                                // ✅ SOLUTION : Laisser l'ennemi continuer à tomber
                                // Il réessaiera le landing à la prochaine frame
                                // NE PAS modifier X, NE PAS modifier vy, NE PAS modifier isGrounded
                                // console.log(`  → Ignoring platform, continuing fall`);

                                // Passer à la plateforme suivante sans traiter celle-ci comme une collision
                                continue;
                            }

                        } else if (this.state.vy < 0) {
                            // Collision depuis le bas (plafond)
                            this.state.y = p.y + p.h;
                            this.state.vy = 0;
                        }
                    }
                    // ... suite du code (CAS 3 reste identique)
                    // 🆕 CAS 3 : Collision vraiment ambiguë (overlapX ≈ overlapY)
                    else {
                        // console.log(`⚠️ [EnemyPhysics] AMBIGUOUS COLLISION resolved as WALL HIT:`, {
                        //     platformId: p.id,
                        //     overlapX: overlapX.toFixed(1),
                        //     overlapY: overlapY.toFixed(1),
                        //     enemyVy: this.state.vy.toFixed(2)
                        // });

                        // Par défaut, traiter comme un wall hit pour éviter le blocage
                        const enemyCenter = this.state.x + this.state.w / 2;
                        const platformCenter = p.x + p.w / 2;

                        if (enemyCenter < platformCenter) {
                            this.state.x = p.x - this.state.w - 1;
                        } else {
                            this.state.x = p.x + p.w + 1;
                        }
                    }
                }
            }
        }
    }

    public checkOverlap(a: Rect, b: Rect): boolean {
        return (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y);
    }

    public findCurrentPlatformId(): number | null {
        const cx = this.state.x + this.state.w / 2;
        const cy = this.state.y + this.state.h;
        for (const p of this.platforms) {
            if (cx >= p.x && cx <= p.x + p.w && Math.abs(cy - p.y) < 10) {
                return p.id;
            }
        }
        return null;
    }
}