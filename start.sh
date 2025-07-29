#!/bin/bash
# Start script for Render

# Set the port for Render
export PORT=${PORT:-8080}

# Set JAVA_HOME
export JAVA_HOME=${JAVA_HOME:-/opt/render/project/src/.render/java}

# Start the application
java -jar target/quarkus-app/quarkus-run.jar
