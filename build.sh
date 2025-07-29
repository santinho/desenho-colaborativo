#!/bin/bash
# Build script for Render

# Set JAVA_HOME if not set
export JAVA_HOME=${JAVA_HOME:-/opt/render/project/src/.render/java}

# Build the application
./mvnw clean package -DskipTests

# The built jar will be in target/quarkus-app/
