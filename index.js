// Import the SDK from a bundle built for these examples

// import * as xeokit from "https://cdn.jsdelivr.net/npm/@xeokit/sdk@0.1.2-alpha/dist/xeokit-sdk.esm.js";

import {DemoHelper} from "./DemoHelper.js";

const urlParams = new URLSearchParams(window.location.search);

let xeokitModelUrl = urlParams.get('url') ?? 'https://xeokit.github.io/xeokit-sdk/assets/models/dotbim/TestStructure.bim';
xeokitModelUrl = decodeURIComponent(xeokitModelUrl);
const xeokitVersion = urlParams.get('xeokit') ?? 'sdk@0.1.5-alpha';
const xeokitUrl = `https://cdn.jsdelivr.net/npm/@xeokit/${xeokitVersion}/dist/xeokit-sdk.esm.js`;
const edges = urlParams.get('edges') ? urlParams.get('edges') === '1' || urlParams.get('edges') === 'true' : false;
const fileType = urlParams.get('fileType');

console.log(fileType);
class ImportError extends Error {}

const loadModule = async (modulePath) => {
  try {
    return await import(modulePath)
  } catch (e) {
    console.log({e});
    alert(e.message);
    throw new ImportError(e.message);
  }
}

const xeokit = await loadModule(xeokitUrl);

// Create a DotBIMLoader to load .BIM files

const dotBIMLoader = new xeokit.dotbim.DotBIMLoader();

// Create an IFCLoader to load .ifc files

const ifcLoader = new xeokit.ifc.IFCLoader();

// Create a Scene to hold geometry and materials

const scene = new xeokit.scene.Scene();

// Create a Data to hold semantic data

const data = new xeokit.data.Data();

// Create a WebGLRenderer to use the browser's WebGL graphics API for rendering

const renderer = new xeokit.webglrenderer.WebGLRenderer({});

// Create a Viewer that will use the WebGLRenderer to draw the Scene

const viewer = new xeokit.viewer.Viewer({
    id: "demoViewer",
    scene,
    renderer
});

// Give the Viewer a single View to render the Scene in our HTML canvas element

const view = viewer.createView({
    id: "demoView",
    elementId: "demoCanvas"
});

const cameraFlight = new xeokit.cameraflight.CameraFlightAnimation(view);
scene.onModelCreated.subscribe(() => {
    cameraFlight.jumpTo({aabb: scene.aabb});
});
const viewIndex = view.viewIndex;
viewer.renderer.setEdgesEnabled(viewIndex, edges);

// Configure the View's World-space coordinate axis to make the +Z axis "up"

// view.camera.worldAxis = [
//     1, 0, 0, // Right +X
//     0, 0, 1, // Up +Z
//     0, -1, 0  // Forward -Y
// ];

// Arrange the View's Camera within our +Z "up" coordinate system

view.camera.eye = [100, 16.914467176601914, 7.399026975905038];
view.camera.look = [0, 0, 0];
view.camera.up = fileType === "ifc" ? [0,1,0] : [0,0,1];


// Add a CameraControl to interactively control the View's Camera with keyboard,
// mouse and touch input

new xeokit.cameracontrol.CameraControl(view, {});

// Create a SceneModel to hold our model's geometry and materials

const sceneModel = scene.createModel({
    id: "demoModel"
});

const loader = fileType === "bim" ? dotBIMLoader : ifcLoader;
// Ignore the DemHelper

const demoHelper = new DemoHelper({
});

demoHelper.init()
    .then(() => {

        // Create a DataModel to hold semantic data for our model

        const dataModel = data.createModel({
            id: "demoModel"
        });

        if (sceneModel instanceof xeokit.core.SDKError) {
            console.error(`Error creating SceneModel: ${sceneModel.message}`);

        } else {

            // Use the DotBIMLoader to load an IFC model from a .BIM file into our SceneModel and DataModel

            fetch(xeokitModelUrl).then(response => {
                if (fileType === "bim") {
                    response = response.json();
                } else {
                    response = response.arrayBuffer();
                }
                response
                    .then(fileData => {

                    loader.load({
                        fileData,
                        sceneModel,
                        dataModel
                    }).then(() => {

                        // Build the SceneModel and DataModel.
                        // The Scene and SceneModel will now contain a SceneObject for each displayable object in our model.
                        // The Data and DataModel will contain a DataObject for each IFC element in the model. Each SceneObject
                        // will have a corresponding DataObject with the same ID, to attach semantic meaning.
                        // The View will contain a ViewObject corresponding to each SceneObject, through which the
                        // appearance of the object can be controlled in the View.

                        dataModel.build();
                        sceneModel.build();

                        demoHelper.finished();

                    }).catch(message => {
                        console.error(`Error loading .BIM: ${message}`);
                    });
                });
            });
        }
    });
