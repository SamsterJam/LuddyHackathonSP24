for platform in linux-x64 macos-x64 win-x64; do
  pkg -t node16-$platform -o build/my-test-app-$platform .
done
