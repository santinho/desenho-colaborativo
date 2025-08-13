# Use RHEL8 as base image
FROM registry.access.redhat.com/rhel8/rhel:latest

# Set working directory
WORKDIR /app

# Copy the native executable from target folder
COPY target/desenho-colaborativo-1.0.0-runner ./desenho-colaborativo-runner

# Make the executable file executable
RUN chmod +x ./desenho-colaborativo-runner

# Expose port
EXPOSE 8080

# Set environment variable for port
ENV PORT=8080

# Run the native application
CMD ["./desenho-colaborativo-runner", "-Dquarkus.http.host=0.0.0.0", "-Dquarkus.http.port=${PORT}"]
