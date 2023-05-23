var prev_scale = 1;
var current_scale = 0;
const scaleDim = {
  width: 0,
  height: 0,
  x: 0,
  y: 0,
};
const shift = {
  x: 0,
  y: 0,
  xSum: 0,
  ySum: 0,
  doShift: false,
};
viewer = new ROS2D.Viewer({
  divID: "map_ros",
  //width: 640,
  //height: 480,
  autoScale: true,
  context2dOptions: { willReadFrequently: true },
});
const handleWheelEvent = (event) => {
  if (event.wheelDeltaY) {
    current_scale =
      event.wheelDeltaY > 0 ? prev_scale * 1.05 : prev_scale / 1.05;
    prev_scale = current_scale;
  }

  viewer.scaleToDimensions(
    scaleDim.width / current_scale,
    scaleDim.height / current_scale
  );
  viewer.shift(
    (scaleDim.x + shift.xSum) / current_scale,
    (scaleDim.y + shift.ySum) / current_scale
  );
};
// Connecting to ROS
// -----------------
var ros = new ROSLIB.Ros();

// If there is an error on the backend, an 'error' emit will be emitted.
ros.on("error", function (error) {
  document.getElementById("connecting").style.display = "none";
  document.getElementById("connected").style.display = "none";
  document.getElementById("closed").style.display = "none";
  document.getElementById("error").style.display = "inline";
  console.log(error);
});

// Find out exactly when we made a connection.
ros.on("connection", async function () {
  console.log("Connection made!");
  document.getElementById("connecting").style.display = "none";
  document.getElementById("error").style.display = "none";
  document.getElementById("closed").style.display = "none";
  document.getElementById("connected").style.display = "inline";
  await init();
  document
    .getElementById("map_ros")
    .addEventListener("wheel", handleWheelEvent);
});

ros.on("close", function () {
  console.log("Connection closed.");
  document.getElementById("connecting").style.display = "none";
  document.getElementById("connected").style.display = "none";
  document.getElementById("closed").style.display = "inline";
  document.removeEventListener("wheel", handleWheelEvent);
});

// Create a connection to the rosbridge WebSocket server.
ros.connect("ws://192.168.0.129:9090");

async function init() {
  console.log("robot visual start");
  // Create the main viewer.

  let gridClient = new ROS2D.OccupancyGridClient({
    ros: ros,
    rootObject: viewer.scene,
    continuous: true,
  });

  // Add panning to the viewer.
  var panView = new ROS2D.PanView({
    rootObject: viewer.scene,
  });
  // Add zoom to the viewer.
  var zoomView = new ROS2D.ZoomView({
    rootObject: viewer.scene,
  });

  // Add navigation goal
  var navGoal = new ROS2D.NavGoal({
    ros: ros,
    rootObject: viewer.scene,
    actionTopic: "/tb3_0/move_base_simple/goal",
  });

  // Scale the canvas to fit to the map
  gridClient.on("change", function () {
    scaleDim.width = gridClient.currentGrid.width;
    scaleDim.height =
      (gridClient.currentGrid.width / window.innerWidth) * window.innerHeight;
    scaleDim.x = gridClient.currentGrid.pose.position.x;
    scaleDim.y =
      (scaleDim.height / gridClient.currentGrid.width) *
      gridClient.currentGrid.pose.position.y;

    viewer.scaleToDimensions(scaleDim.width, scaleDim.height);
    viewer.shift(scaleDim.x, scaleDim.y);

    shift.xSum = 0;
    shift.ySum = 0;
    shift.doShift = false;

    registerMouseHandlers();
  });

  function registerMouseHandlers() {
    // Setup mouse event handlers
    var mouseDown = false;
    var zoomKey = false;
    var panKey = false;
    var startPos = new ROSLIB.Vector3();
    viewer.scene.addEventListener("stagemousedown", function (event) {
      if (event.nativeEvent.ctrlKey === true) {
        zoomKey = true;
        zoomView.startZoom(event.stageX, event.stageY);
      } else if (event.nativeEvent.shiftKey === true) {
        panKey = true;
        panView.startPan(event.stageX, event.stageY);
      }else {
        
        var pos = viewer.scene.globalToRos(event.stageX, event.stageY);
        console.log("🚀 ~ file: robotgui.js:138 ~ pos:", pos)
        navGoal.startGoalSelection(pos);
      }
      // startPos.x = event.stageX;
      // startPos.y = event.stageY;
      mouseDown = true;
    });

    viewer.scene.addEventListener("stagemousemove", function (event) {
      if (mouseDown === true) {
        if (zoomKey === true) {
          var dy = event.stageY - startPos.y;
          var zoom = 1 + (10 * Math.abs(dy)) / viewer.scene.canvas.clientHeight;
          if (dy < 0) zoom = 1 / zoom;
          zoomView.zoom(zoom);
        } else if (panKey === true) {
          shift.x = event.stageX;
          shift.y = event.stageY;
          panView.pan(event.stageX, event.stageY);
        }else {
          var pos = viewer.scene.globalToRos(event.stageX, event.stageY);
          navGoal.orientGoalSelection(pos);
        }
      }
    });

    viewer.scene.addEventListener("stagemouseup", function (event) {
      if (mouseDown === true) {
        if (zoomKey === true) {
          zoomKey = false;
        } else if (panKey === true) {
          panKey = false;
        } else {
          var pos = viewer.scene.globalToRos(event.stageX, event.stageY);
          var goalPose = navGoal.endGoalSelection(pos);
          navGoal.sendGoal(goalPose);
        }
        mouseDown = false;
      }
    });
  }

  // =================== create robot=================

  var initSubscribePose = function (discriminator, robotMarker) {
    discriminator.subscribe(function (pose) {
      robotMarker.x = pose.pose.pose.position.x;
      robotMarker.y = -pose.pose.pose.position.y;
      robotMarker.rotation = viewer.scene.rosQuaternionToGlobalTheta(
        pose.pose.pose.orientation
      );
    });
  };

  var initSubscribePathPlan = function (discriminator, pathView) {
    discriminator.subscribe(function (pose) {
      pathView.setPath(pose);
    });
  };

  let robots = [
    {
      model: "",
      pathTopic: "/move_base/NavfnROS/plan",
      name: "/tb3_0",
      fillColor: createjs.Graphics.getRGB(255, 128, 0.66),
    },
    {
      model: "",
      name: "/tb3_1",
      pathTopic: "/move_base/NavfnROS/plan",
      fillColor: createjs.Graphics.getRGB(0, 255, 128),
    },
    {
      model: "",
      name: "/tb3_2",
      pathTopic: "/move_base/NavfnROS/plan",
      fillColor: createjs.Graphics.getRGB(0, 128, 255),
    },
  ];

  for (let i = 0; i < robots.length; i++) {
    // Setup the map client.
    robots[i]["model"] = new ROS2D.Robot({
      strokeColor: createjs.Graphics.getRGB(255, 0, 0),
      fillColor: robots[i].fillColor,
    });
    robots[i]["initPoseListener"] = new ROSLIB.Topic({
      ros: ros,
      name: robots[i].name + "/initialpose",
      messageType: "geometry_msgs/PoseWithCovarianceStamped",
      throttle_rate: 100,
    });

    robots[i]["poseTopic"] = new ROSLIB.Topic({
      ros: ros,
      name: robots[i].name + "/amcl_pose",
      messageType: "geometry_msgs/PoseWithCovarianceStamped",
    });

    // ===== create path view =========
    robots[i]["pathView"] = new ROS2D.PathShape({
      strokeSize: 0.02,
      strokeColor: "#" + Math.floor(Math.random() * 16777215).toString(16),
    });
    robots[i]["pathGlobalTopic"] = new ROSLIB.Topic({
      ros: ros,
      name: robots[i].name + robots[i].pathTopic,
      messageType: "nav_msgs/Path",
    });
  }

  for (let i = 0; i < robots.length; i++) {
    gridClient.rootObject.addChild(robots[i].model);

    initSubscribePose(robots[i].poseTopic, robots[i].model);
    initSubscribePose(robots[i].initPoseListener, robots[i].model);

    gridClient.rootObject.addChild(robots[i].pathView);
    initSubscribePathPlan(robots[i].pathGlobalTopic, robots[i].pathView);
  }
}
