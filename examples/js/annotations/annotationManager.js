(function () {

    "use strict";

    const PIN_COLOR = XEO.math.vec4([1.0, 1.0, 0.0]);

    /**
     * Manages the {{#crossLink "Annotation/visible:event"}}Annotations{{/crossLink}} within a
     * {{#crossLink "Scene/visible:event"}}{{/crossLink}}.
     */
    XEO.AnnotationManager = XEO.Component.extend({

        _init: function (cfg) {

            this.annotations = {};

            this._listDirty = true;

            this._cameraFlight = this.create(XEO.CameraFlight, {
                duration: 1.0
            });

            this.visible = cfg.visible;
        },

        _props: {

            /**
             * The visibility status of the {{#crossLink "Annotation/visible:event"}}Annotations{{/crossLink}}
             * this AnnotationManager.
             *
             * Fires an {{#crossLink "AnnotationManager/visible:event"}}{{/crossLink}} event on change.
             *
             * @property visible
             * @type Boolean
             */
            visible: {

                set: function (value) {

                    value = value !== false;

                    if (this._visible !== value) {

                        this._visible = value;

                        if (this._visible) {
                            this._onRendered = this.scene.on("rendered", this._update, this);

                        } else {

                            // All Annotations currently invisible

                            this.scene.off(this._onRendered);
                            this._update();

                        }

                        this.fire("visible", this._visible);
                    }
                },

                get: function () {
                    return this._visible;
                }
            },

            open: {

                set: function (value) {

                    if (this._open !== value) {

                        if (this._open) {
                            this._open.open = false;
                        }

                        this._open = value;

                        if (this._open) {
                            this._open.open = true;
                        }

                        this.fire("open", this._open);
                    }
                },

                get: function () {
                    return this._open;
                }
            }
        },

        _update: (function () {

            var visibleList = [];
            var list = [];
            var listLen = 0;
            var pixels = [];
            var colors = [];

            return function () {

                var canvas = this.scene.canvas;
                var annotation;

                if (this._listDirty) { // Lazy-build Annotation list

                    listLen = 0;

                    for (var id in this.annotations) {
                        if (this.annotations.hasOwnProperty(id)) {
                            list[listLen++] = this.annotations[id];
                        }
                    }

                    this._listDirty = false;
                }

                if (!this._visible) {

                    // All Annotations currently invisible

                    for (i = 0; i < listLen; i++) {
                        annotation = list[i];
                        annotation.visible = false;
                    }

                    return;
                }

                var canvasPos;
                var canvasX;
                var canvasY;
                var lenPixels = 0;
                var i;
                var boundary = this.scene.canvas.boundary;
                var canvasWidth = boundary[2];
                var canvasHeight = boundary[2];
                var visibleListLen = 0;

                // Hide annotations that fall outside canvas

                for (i = 0; i < listLen; i++) {

                    annotation = list[i];
                    canvasPos = annotation.canvasBoundary.center;
                    canvasX = canvasPos[0];
                    canvasY = canvasPos[1];

                    if (!this._visible
                        || (canvasX + 5) < 0
                        || (canvasY + 5) < 0
                        || (canvasX - 5) > canvasWidth
                        || (canvasY - 5 ) > canvasHeight) {

                        annotation.visible = false;

                    } else {

                        visibleList[visibleListLen++] = annotation;

                        pixels[lenPixels++] = canvasPos[0];
                        pixels[lenPixels++] = canvasPos[1];
                    }
                }

                // Hide annotations that are occluded by Entities

                var opaqueOnly = true;

                canvas.readPixels(pixels, colors, visibleListLen, opaqueOnly);

                var r = PIN_COLOR[0] * 255;
                var g = PIN_COLOR[1] * 255;
                var b = PIN_COLOR[2] * 255;

                for (i = 0; i < visibleListLen; i++) {
                    annotation = visibleList[i];
                    annotation.visible = (colors[i * 4] === r && colors[i * 4 + 1] === g && colors[i * 4 + 2] === b);
                }
            };
        })(),

        addAnnotation: function (annotation) {

            this.annotations[annotation.id] = annotation;

            var self = this;

            annotation._pinElement.onmouseenter = function () {
                self.open = annotation;
            };

            annotation._pinElement.onclick = function () {
                self._cameraFlight.flyTo({
                    aabb: annotation.entity.worldBoundary.aabb
                })
            };

            this.open = annotation;

            this._listDirty = true;

            this.fire("annotationCreated", annotation);
        },

        removeAnnotation: function (annotation) {

            delete this.annotations[annotation.id];

            this._listDirty = true;

            this.fire("annotationDestroyed", annotation);
        }
    });

})();