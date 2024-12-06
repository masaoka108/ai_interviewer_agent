self.__BUILD_MANIFEST = {
  "polyfillFiles": [
    "static/chunks/polyfills.js"
  ],
  "devFiles": [
    "static/chunks/react-refresh.js"
  ],
  "ampDevFiles": [],
  "lowPriorityFiles": [],
  "rootMainFiles": [],
  "rootMainFilesTree": {},
  "pages": {
    "/_app": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/_app.js"
    ],
    "/_error": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/_error.js"
    ],
    "/interviews/[url]": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/interviews/[url].js"
    ],
    "/job-postings": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/job-postings.js"
    ],
    "/job-postings/[id]/interviews/[interviewId]": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/job-postings/[id]/interviews/[interviewId].js"
    ]
  },
  "ampFirstPages": []
};
self.__BUILD_MANIFEST.lowPriorityFiles = [
"/static/" + process.env.__NEXT_BUILD_ID + "/_buildManifest.js",
,"/static/" + process.env.__NEXT_BUILD_ID + "/_ssgManifest.js",

];